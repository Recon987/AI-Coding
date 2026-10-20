// 실제 Electron에서 날짜 탐색·기록 포커스·화면 배치와 원본 자료 보존을 검사한다.
const { _electron: electron } = require("playwright");
const { goTo } = require("./nav.cjs");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { empty } = require("../shared/model.mjs");
// Button wording comes from the app (TASK-LABELS-01 U6).
const L = require("../shared/labels.mjs");
const root = path.resolve(__dirname, "..");

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "park-calendar-smoke-"));
  let app,
    failed = false;
  const errors = [],
    external = [],
    layouts = [];
  try {
    app = await electron.launch({
      executablePath: process.env.PARK_TEST_EXECUTABLE || require("electron"),
      args: [
        ...(process.platform === "linux"
          ? ["--no-sandbox", "--ozone-platform=headless"]
          : []),
        "--user-data-dir=" + path.join(dir, "profile"),
        ...(process.env.PARK_TEST_EXECUTABLE ? [] : [root]),
      ],
      env: {
        ...process.env,
        TZ: "Asia/Seoul",
        XDG_CONFIG_HOME: path.join(dir, "config"),
      },
      timeout: 30000,
    });
    const page = await app.firstWindow();
    page.setDefaultTimeout(8000);
    page.on("pageerror", (error) => errors.push(error.message));
    page.context().on("request", (request) => {
      if (/^https?:/i.test(request.url())) external.push(request.url());
    });
    await page.clock.install({ time: new Date("2028-02-29T09:30:00+09:00") });
    await page.locator('.save-indicator[data-state="ready"]').waitFor();
    const data = empty();
    data.events = [
      {
        id: "daily",
        title: "가상 일일 점검",
        at: "2000-01-01T09:00:00+09:00",
        done: false,
        recurrence: "daily",
      },
      {
        id: "leap",
        title: "가상 윤년 점검",
        at: "2028-02-29T10:00:00+09:00",
        done: false,
      },
    ];
    await page.evaluate((value) => window.workdesk.save(value), data);
    await page.reload();
    await page.locator('.save-indicator[data-state="ready"]').waitFor();
    const before = await page.evaluate(() => window.workdesk.load());
    await goTo(page, "월간 일정");
    const agenda = page.getByRole("region", {
      name: "선택 날짜 기록",
      exact: true,
    });
    const grid = page.getByRole("grid", { name: "2028년 2월", exact: true });
    const day = (date) => page.locator(`.calendar-day[data-date="${date}"]`);
    const active = () =>
      page.evaluate(() => document.activeElement?.getAttribute("data-date"));
    const selected = () =>
      page
        .locator('.calendar-day[aria-pressed="true"]')
        .getAttribute("data-date");
    const assertFocus = async (date) => {
      await page.waitForFunction(
        (key) => document.activeElement?.getAttribute("data-date") === key,
        date,
      );
      assert.equal(await active(), date);
      assert.equal(
        await page.locator('.calendar-day[tabindex="0"]').count(),
        1,
        "격자 전체의 Tab 정지점은 하나",
      );
      assert.equal(await day(date).getAttribute("tabindex"), "0");
    };
    const move = async (key, date) => {
      await page.keyboard.press(key);
      await assertFocus(date);
    };
    assert.equal(await grid.getByRole("columnheader").count(), 7);
    assert.equal(await grid.getByRole("row").count(), 7);
    assert.equal(await grid.getByRole("gridcell").count(), 42);
    assert.equal(await day("2028-02-29").getAttribute("aria-current"), "date");
    await day("2028-02-29").focus();
    await move("ArrowLeft", "2028-02-28");
    await move("ArrowRight", "2028-02-29");
    await move("ArrowUp", "2028-02-22");
    await move("ArrowDown", "2028-02-29");
    assert.equal(
      await selected(),
      "2028-02-29",
      "이동만으로 선택 날짜를 변경하지 않는다",
    );
    await move("Home", "2028-02-27");
    await move("End", "2028-03-04");
    await move("Home", "2028-02-27");
    await move("ArrowDown", "2028-03-05");
    await move("ArrowUp", "2028-02-27");
    await day("2028-02-29").focus();
    await move("PageUp", "2028-01-29");
    await move("ArrowRight", "2028-01-30");
    await move("ArrowRight", "2028-01-31");
    await move("PageDown", "2028-02-29");
    await move("PageUp", "2028-01-29");
    await move("PageUp", "2027-12-29");
    await move("ArrowRight", "2027-12-30");
    await move("ArrowRight", "2027-12-31");
    await move("ArrowRight", "2028-01-01");
    await move("ArrowLeft", "2027-12-31");
    await move("PageUp", "2027-11-30");
    await move("PageDown", "2027-12-30");
    await move("ArrowRight", "2027-12-31");
    // 표시 월과 선택 날짜가 400일 넘게 떨어져도 양쪽 원본 자료를 유지한다.
    for (let n = 0; n < 18; n++) await page.keyboard.press("PageUp");
    await assertFocus("2026-06-28");
    assert.equal(
      await agenda
        .getByRole("button", { name: "가상 윤년 점검", exact: true })
        .count(),
      1,
      "먼 달 탐색 중에도 선택 날짜 기록 유지",
    );
    assert.ok(
      (await page
        .locator(".calendar-chip")
        .filter({ hasText: "가상 일일 점검" })
        .count()) >= 28,
      "먼 달에서도 원본 반복 회차 표시",
    );
    await page.keyboard.press("Enter");
    await page.waitForFunction(() =>
      document.activeElement?.classList.contains("calendar-agenda"),
    );
    assert.equal(await selected(), "2026-06-28");
    assert.equal(
      await agenda
        .getByRole("button", { name: "가상 일일 점검", exact: true })
        .count(),
      1,
    );
    await page.keyboard.press("Shift+Tab");
    await assertFocus("2026-06-28");
    await move("ArrowRight", "2026-06-29");
    await page.keyboard.press("Space");
    await page.waitForFunction(() =>
      document.activeElement?.classList.contains("calendar-agenda"),
    );
    assert.equal(await selected(), "2026-06-29");
    const monthTab = page.getByRole("tab", { name: "월간", exact: true });
    await monthTab.focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(
      await page
        .getByRole("tab", { name: "주간", exact: true })
        .getAttribute("aria-selected"),
      "true",
    );
    assert.equal(
      await page.getByRole("tabpanel", { name: "주간", exact: true }).count(),
      1,
    );
    await page.keyboard.press("End");
    assert.equal(
      await page
        .getByRole("tab", { name: "목록", exact: true })
        .getAttribute("aria-selected"),
      "true",
    );
    await page.keyboard.press("Home");
    assert.equal(await monthTab.getAttribute("aria-selected"), "true");
    await page.getByRole("button", { name: "다음 달", exact: true }).click();
    assert.equal(
      await page
        .locator('.calendar-day[tabindex="0"]')
        .getAttribute("data-date"),
      "2026-07-01",
    );
    await page.getByRole("button", { name: "오늘", exact: true }).click();
    assert.equal(await selected(), "2028-02-29");
    const add = page.getByRole("button", { name: L.addLabel(L.TARGET.event), exact: true });
    await add.click();
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(
      await add.evaluate((el) => document.activeElement === el),
      true,
      "취소 후 호출 버튼으로 복귀",
    );
    assert.equal(await page.locator('.calendar-day[tabindex="0"]').count(), 1);
    for (const [width, height, zoom] of [
      [1280, 800, 1],
      [960, 680, 1],
      [800, 680, 1],
      [1280, 800, 1.25],
      [960, 680, 1.25],
    ]) {
      await page.setViewportSize({ width, height });
      await app.evaluate(
        ({ BrowserWindow }, value) =>
          BrowserWindow.getAllWindows()[0].webContents.setZoomFactor(value),
        zoom,
      );
      await page.waitForFunction(
        (expected) => Math.abs(innerWidth - expected) <= 1,
        width / zoom,
      );
      await page.evaluate(() => window.scrollTo(0, 0));
      const layout = await page.evaluate(() => {
        const box = (selector) => {
          const r = document.querySelector(selector).getBoundingClientRect();
          return {
            x: r.x,
            y: r.y,
            right: r.right,
            bottom: r.bottom,
            width: r.width,
          };
        };
        return {
          viewport: innerWidth,
          overflow: document.documentElement.scrollWidth - innerWidth,
          panel: box(".calendar-view-panel"),
          agenda: box(".calendar-agenda"),
          grid: box(".calendar-month-grid"),
          nav: box(".calendar-navigation"),
          title: box("#calendar-heading"),
          tabs: box(".calendar-views"),
        };
      });
      assert.ok(
        layout.overflow <= 1,
        `수평 넘침 없음: ${JSON.stringify(layout)}`,
      );
      if (layout.viewport >= 900) {
        assert.ok(
          Math.abs(layout.panel.y - layout.agenda.y) <= 1 &&
            layout.panel.right < layout.agenda.x,
          "900 CSS px 이상은 날짜/기록 두 열",
        );
        assert.ok(
          layout.nav.right <= layout.title.x &&
            layout.title.right <= layout.tabs.x + 1,
          "툴바 세 영역이 겹치지 않음",
        );
      } else
        assert.ok(
          layout.agenda.y > layout.panel.bottom,
          "좁은 CSS 화면에서는 기록이 아래로 이동",
        );
      assert.ok(
        layout.grid.right <= layout.panel.right &&
          layout.grid.x >= layout.panel.x,
        "날짜 격자는 패널 안에 배치",
      );
      assert.ok(
        layout.grid.y >= layout.panel.y && layout.grid.y < layout.panel.y + 130,
        "범례·요일 안내가 날짜 격자를 과도하게 밀지 않음",
      );
      layouts.push({ width, height, zoom, ...layout });
      if (process.env.PARK_CALENDAR_CAPTURE) {
        fs.mkdirSync(process.env.PARK_CALENDAR_CAPTURE, { recursive: true });
        await page.screenshot({
          path: path.join(
            process.env.PARK_CALENDAR_CAPTURE,
            `${width}-${zoom}.png`,
          ),
        });
      }
    }
    assert.deepEqual(
      await page.evaluate(() => window.workdesk.load()),
      before,
      "날짜·보기·확대·취소 탐색은 저장 자료를 변경하지 않음",
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    console.log(
      JSON.stringify({
        status: "PASS",
        suite: "calendar",
        keyboard: "윤년·월말·연도·400일 초과·선택/포커스·Enter/Space·탭·취소",
        layouts,
        errors,
        external,
      }),
    );
  } catch (error) {
    failed = true;
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (app) {
      if (failed) await app.evaluate(({ app }) => app.exit(1)).catch(() => {});
      else await app.close();
    }
    fs.rmSync(dir, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    });
  }
})();
