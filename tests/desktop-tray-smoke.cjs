// Real Electron lifecycle/IPC/storage; only OS notification and quit-confirmation widgets are doubled.
const { _electron: electron } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

module.exports = async function traySmoke() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "park-tray-test-"));
  let app;
  const launch = () =>
    electron.launch({
      executablePath: process.env.PARK_TEST_EXECUTABLE || require("electron"),
      args: [
        ...(process.platform === "linux"
          ? ["--no-sandbox", "--ozone-platform=headless"]
          : []),
        "--user-data-dir=" + dir,
        ...(process.env.PARK_TEST_EXECUTABLE
          ? []
          : [path.resolve(__dirname, "..")]),
      ],
      env: {
        ...process.env,
        XDG_CONFIG_HOME: path.join(dir, "config"),
        XDG_CACHE_HOME: path.join(dir, "cache"),
      },
      timeout: 30000,
    });
  const pause = () => new Promise((r) => setTimeout(r, 200));
  try {
    app = await launch();
    let page = await app.firstWindow();
    await page.locator('.save-indicator[data-state="ready"]').waitFor();
    assert.equal(
      (await page.evaluate(() => window.workdesk.getDesktopSettings()))
        .closeToTray,
      false,
    );
    await assert.rejects(
      page.evaluate(() => window.workdesk.setCloseToTray("true")),
      /켜기 또는 끄기/,
    );
    await app.evaluate(({ Notification }) => {
      globalThis.__trayNotifications = [];
      Notification.isSupported = () => true;
      Notification.prototype.show = function () {
        globalThis.__trayNotifications.push(this);
      };
    });
    const saved = await page.evaluate(async () => {
      const data = await window.workdesk.load();
      const now = Date.now();
      const event = (id, ago, done = false) => ({
        id,
        title: id,
        at: new Date(now - ago).toISOString(),
        done,
      });
      const hour = 60 * 60 * 1000;
      const series = new Date(now - 2 * hour);
      series.setFullYear(2000);
      data.events = [
        event("복귀 확인1", 2 * hour),
        event("복귀 확인2", 3 * hour),
        event("복귀 확인3", 4 * hour),
        {
          ...event("장기 반복", 2 * hour),
          at: series.toISOString(),
          recurrence: "daily",
        },
        event("미래 제외", -hour),
        event("완료 제외", hour, true),
        event("24시간 밖 제외", 25 * hour),
      ];
      data.tasks = [
        {
          id: "resume-task",
          kind: "submission",
          title: "서류 제출",
          body: "",
          at: new Date(now + hour).toISOString(),
          assignee: "",
          destination: "",
          priority: "normal",
          remindMinutes: 1440,
          patrolId: null,
          done: false,
          completedAt: null,
        },
      ];
      await window.workdesk.save(data);
      return data;
    });
    await app.evaluate(({ powerMonitor }) => powerMonitor.emit("resume"));
    const messages = await app.evaluate(() =>
      globalThis.__trayNotifications.map((n) => ({
        title: n.title,
        body: n.body,
      })),
    );
    assert.equal(messages.length, 1);
    assert.match(messages[0].title, /복귀 후/);
    assert.match(messages[0].body, /5건/);
    assert.doesNotMatch(messages[0].body, /미래 제외|완료 제외|24시간 밖 제외/);
    assert.match(
      messages[0].body,
      /서류 제출/,
      "업무 원본의 사전 알림 시각도 복귀 점검",
    );
    await app.evaluate(({ powerMonitor }) => powerMonitor.emit("resume"));
    assert.equal(
      await app.evaluate(() => globalThis.__trayNotifications.length),
      1,
    );
    assert.deepEqual(await page.evaluate(() => window.workdesk.load()), saved);

    await page
      .locator("nav")
      .getByRole("button", { name: "앱 안내", exact: true })
      .click();
    const toggle = page.getByRole("checkbox", {
      name: "창을 닫아도 시스템 트레이에 유지",
    });
    // Chromium's headless Linux GTK backend aborts the entire process when a
    // native Tray is constructed (no JS exception). Actual Tray construction and
    // hide/reopen run on Windows CI; injectable policy tests cover Linux logic.
    if (process.platform !== "linux") {
      await toggle.check();
      await page
        .getByText("트레이 상주 켜짐 · 창을 숨겨도 알림을 확인합니다.", {
          exact: true,
        })
        .waitFor();
    } else
      console.log(
        "UNRUN: native tray creation/hide/reopen on headless Linux; required on Windows CI",
      );
    const settings = await page.evaluate(() =>
      window.workdesk.getDesktopSettings(),
    );
    if (!settings.closeToTray) {
      assert.equal(
        process.platform,
        "linux",
        "Windows CI에서는 실제 트레이 생성이 성공해야 합니다.",
      );
      assert.equal(settings.trayAvailable, false);
      assert.equal(
        await app.evaluate(({ BrowserWindow }) =>
          BrowserWindow.getAllWindows()[0].isVisible(),
        ),
        true,
      );
    } else {
      assert.equal(settings.trayAvailable, true);
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0].close(),
      );
      await pause();
      assert.equal(
        await app.evaluate(({ BrowserWindow }) =>
          BrowserWindow.getAllWindows()[0].isVisible(),
        ),
        false,
      );
      await app.evaluate(({ app }) => app.emit("second-instance"));
      assert.equal(
        await app.evaluate(({ BrowserWindow }) =>
          BrowserWindow.getAllWindows()[0].isVisible(),
        ),
        true,
      );
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0].close(),
      );
      await pause();
      await app.evaluate(() => globalThis.__trayNotifications[0].emit("click"));
      assert.equal(
        await app.evaluate(({ BrowserWindow }) =>
          BrowserWindow.getAllWindows()[0].isVisible(),
        ),
        true,
      );
    }
    // Persisted opt-in survives a real process restart. Explicit quit must exit even with tray enabled.
    await app.close();
    app = await launch();
    page = await app.firstWindow();
    await page.locator('.save-indicator[data-state="ready"]').waitFor();
    assert.equal(
      (await page.evaluate(() => window.workdesk.getDesktopSettings()))
        .closeToTray,
      settings.closeToTray,
    );
    await app.evaluate(({ Notification, powerMonitor }) => {
      globalThis.__trayNotifications = [];
      Notification.isSupported = () => true;
      Notification.prototype.show = function () {
        globalThis.__trayNotifications.push(this);
      };
      powerMonitor.emit("resume");
    });
    assert.equal(
      await app.evaluate(() => globalThis.__trayNotifications.length),
      0,
      "재실행 후 같은 회차 중복 금지",
    );
    assert.deepEqual(await page.evaluate(() => window.workdesk.load()), saved);
    // A dirty draft survives a cancelled explicit quit, then an approved quit exits.
    await page
      .locator("nav")
      .getByRole("button", { name: "업무 메모", exact: true })
      .click();
    await page.getByRole("button", { name: "메모 추가", exact: true }).click();
    await page
      .getByLabel("제목", { exact: true })
      .fill("종료 취소로 보호할 초안");
    await app.evaluate(({ dialog, app }) => {
      globalThis.__quitPrompts = 0;
      dialog.showMessageBoxSync = (_parent, options) => {
        globalThis.__quitPrompts++;
        if (options.defaultId !== 0 || options.cancelId !== 0)
          throw new Error("기본 취소 정책 위반");
        return 0;
      };
      app.quit();
    });
    await pause();
    assert.equal(await app.evaluate(() => globalThis.__quitPrompts), 1);
    assert.equal(
      await page.getByLabel("제목", { exact: true }).inputValue(),
      "종료 취소로 보호할 초안",
    );
    assert.equal(
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0].isVisible(),
      ),
      true,
    );
    if (settings.closeToTray) {
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0].close(),
      );
      await pause();
      assert.equal(
        await app.evaluate(({ BrowserWindow }) =>
          BrowserWindow.getAllWindows()[0].isVisible(),
        ),
        false,
        "종료 취소 후에도 닫기는 트레이 숨김",
      );
      await app.evaluate(({ app }) => app.emit("second-instance"));
    }
    await app.evaluate(({ dialog }) => {
      dialog.showMessageBoxSync = () => 1;
    });
    await app.close();
    app = null;
    console.log(
      "PASS: PC 설정·resume24h·요약·완료/미래 제외·영구 중복 방지·미저장 종료 취소/승인; 실제 트레이 닫기/복귀는 Windows에서 검증",
    );
  } finally {
    if (app) await app.evaluate(({ app }) => app.exit(1)).catch(() => {});
    fs.rmSync(dir, { recursive: true, force: true });
  }
};
