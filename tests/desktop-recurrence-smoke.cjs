// Real Electron, original-event storage and UI. Only OS file dialogs are doubled.
const { _electron: electron } = require("playwright");
const { goTo } = require("./nav.cjs");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { empty, reminderItems, briefing } = require("../shared/model.mjs");
const { selectDue } = require("../desktop/notifications.cjs");
const store = require("../desktop/store.cjs");
const { TEST_PASSWORD, fillBackupPassword, fillRestorePassword } = require("./backup-ui.cjs");
// Button wording comes from the app (TASK-LABELS-01 U6).
const L = require("../shared/labels.mjs");

const root = path.resolve(__dirname, "..");
const DATE = "2026-10-15";
const NEXT = "2026-10-16";
const TITLE = "가상 반복 회의";
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "park-recurrence-smoke-"));
  let app, page;
  let failed = false;
  const launch = async () => {
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
    page = await app.firstWindow();
    page.setDefaultTimeout(8000);
    await page.clock.install({ time: new Date(`${DATE}T09:30:00+09:00`) });
    await page.locator('.save-indicator[data-state="ready"]').waitFor();
  };
  const nav = (name) => goTo(page, name);
  const load = () => page.evaluate(() => window.workdesk.load());
  const selectDate = async (date) => {
    await page.locator(`.calendar-day[data-date="${date}"]`).click();
  };
  const manage = async (name) => {
    await page.locator(".data-menu > summary").click();
    await page
      .locator(".data-menu")
      .getByRole("button", { name, exact: true })
      .click();
  };
  const waitEvent = async (predicate) => {
    for (let n = 0; n < 100; n++) {
      const event = (await load()).events.find((e) => e.id === "repeat");
      if (predicate(event)) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.fail("회차 저장 결과를 확인하지 못했습니다.");
  };
  const capture = async (name) => {
    if (!process.env.PARK_RECURRENCE_CAPTURE) return;
    fs.mkdirSync(process.env.PARK_RECURRENCE_CAPTURE, { recursive: true });
    await page.screenshot({
      path: path.join(process.env.PARK_RECURRENCE_CAPTURE, name + ".png"),
    });
  };
  try {
    await launch();
    await page.setViewportSize({ width: 1280, height: 800 });
    const data = empty();
    data.events = [
      {
        id: "repeat",
        title: TITLE,
        at: "2000-01-01T09:00:00+09:00",
        done: false,
        recurrence: "daily",
        repeatUntil: "2026-10-18",
      },
      {
        id: "legacy",
        title: "가상 기존 전체 완료",
        at: `${DATE}T10:00:00+09:00`,
        done: true,
        recurrence: "daily",
      },
    ];
    await page.evaluate((value) => window.workdesk.save(value), data);
    await page.reload();
    await page.locator('.save-indicator[data-state="ready"]').waitFor();
    await nav("월간 일정");
    const firstDone = page.getByRole("checkbox", {
      name: `${TITLE} ${DATE} 회차 완료`,
      exact: true,
    });
    await firstDone.click();
    await waitEvent((event) => event.completedDates?.includes(DATE));
    let saved = await load();
    assert.equal(saved.events[0].done, false);
    assert.deepEqual(saved.events[0].completedDates, [DATE]);
    assert.match(briefing(saved, DATE), /\[완료\/매일\].*가상 반복 회의/);
    assert.match(briefing(saved, NEXT), /\[예정\/매일\].*가상 반복 회의/);
    const now = Date.parse(`${NEXT}T09:00:10+09:00`);
    assert.ok(
      selectDue(reminderItems(saved, now), now).some(
        (item) => item.title === TITLE,
      ),
    );

    // The actual TXT export uses the same source state as the visible briefing.
    const txt = path.join(dir, "briefing.txt");
    await app.evaluate(({ dialog }, file) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: file });
    }, txt);
    await nav("업무 브리핑");
    await page
      .getByRole("button", { name: "텍스트로 내보내기", exact: true })
      .click();
    await page
      .getByText("브리핑을 텍스트 파일로 저장했습니다.", { exact: true })
      .waitFor();
    assert.match(
      fs.readFileSync(txt, "utf8"),
      /\[완료\/매일\].*가상 반복 회의/,
    );

    // Opening tomorrow's briefing record must retain tomorrow's occurrence context.
    await page.getByRole("button", { name: /^금 16일, 2026\. 10\. 16\. 기록/ }).click();
    await page.locator(".timeline-row").filter({ hasText: TITLE }).click();
    const editor = page.getByRole("dialog", { name: "일정 수정", exact: true });
    await editor.waitFor();
    const manager = editor.getByRole("region", { name: "반복 회차 관리" });
    await manager
      .getByRole("heading", { name: "2026. 10. 16. (금) 회차", exact: true })
      .waitFor();
    const nextDone = manager.getByRole("checkbox", {
      name: `${TITLE} ${NEXT} 회차 완료`,
      exact: true,
    });
    assert.equal(await nextDone.isChecked(), false);
    // Rejected writes keep the modal and original state, with the failure visible inside it.
    await app.evaluate(({ ipcMain }) => {
      globalThis.__recurrenceSave = ipcMain._invokeHandlers.get("save");
      ipcMain.removeHandler("save");
      ipcMain.handle("save", () => {
        throw new Error("가상 회차 저장 실패");
      });
    });
    await nextDone.click();
    await editor
      .getByRole("alert")
      .filter({ hasText: "회차 변경을 저장하지 못했습니다" })
      .waitFor();
    assert.equal((await load()).events[0].completedDates.includes(NEXT), false);
    // While an actual save is pending, typing cannot be silently overwritten by a baseline refresh.
    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler("save");
      ipcMain.handle("save", async (event, value) => {
        await new Promise((resolve) => {
          globalThis.__releaseRecurrenceSave = resolve;
        });
        return globalThis.__recurrenceSave(event, value);
      });
    });
    await nextDone.click();
    await page.locator('.save-indicator[data-state="busy"]').waitFor();
    assert.equal(
      await editor.getByLabel("일정 제목", { exact: true }).isDisabled(),
      true,
    );
    assert.equal(
      await editor.getByLabel("일정 일시", { exact: true }).isDisabled(),
      true,
    );
    assert.equal(
      await editor.getByLabel("반복 주기", { exact: true }).isDisabled(),
      true,
    );
    await app.evaluate(() => globalThis.__releaseRecurrenceSave());
    await waitEvent((event) => event.completedDates?.includes(NEXT));
    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler("save");
      ipcMain.handle("save", globalThis.__recurrenceSave);
    });
    await page.locator('.save-indicator[data-state="ready"]').waitFor();
    await capture("occurrence-editor");
    await manager
      .getByRole("button", { name: `${TITLE} ${NEXT} 회차 제외`, exact: true })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "이 회차 제외", exact: true })
      .click();
    await waitEvent((event) => event.excludedDates?.includes(NEXT));
    await editor.getByText("제외한 회차입니다.", { exact: false }).waitFor();
    await page.keyboard.press("Escape");
    await editor.waitFor({ state: "hidden" });
    await page
      .getByRole("button", { name: "제외 회차 관리 (1)", exact: true })
      .click();
    await capture("excluded-occurrences");
    const restore = page.getByRole("button", {
      name: `${TITLE} ${NEXT} 제외 복원`,
      exact: true,
    });
    await restore.click();
    await waitEvent((event) => event.excludedDates?.length === 0);
    assert.ok(
      (await load()).events[0].completedDates.includes(NEXT),
      "제외 복원 후 완료 기록 보존",
    );
    await selectDate(NEXT);
    assert.equal(
      await page
        .getByRole("checkbox", {
          name: `${TITLE} ${NEXT} 회차 완료`,
          exact: true,
        })
        .isChecked(),
      true,
    );
    await page
      .getByRole("button", { name: `${TITLE} ${NEXT} 회차 제외`, exact: true })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "이 회차 제외", exact: true })
      .click();
    await waitEvent((event) => event.excludedDates?.includes(NEXT));
    assert.doesNotMatch(briefing(await load(), NEXT), /가상 반복 회의/);

    // Series title edits preserve completion/exclusion metadata.
    await selectDate(DATE);
    await page.getByRole("button", { name: TITLE, exact: true }).click();
    await editor.getByLabel("일정 제목", { exact: true }).fill(TITLE + " 수정");
    assert.equal(
      await editor
        .getByRole("checkbox", {
          name: `${TITLE} ${DATE} 회차 완료`,
          exact: true,
        })
        .isEnabled(),
      false,
      "미저장 수정 중 회차 변경 차단",
    );
    await editor
      .getByRole("button", { name: L.SAVE, exact: true })
      .click();
    await editor.waitFor({ state: "hidden" });
    await waitEvent((event) => event.title.endsWith(" 수정"));
    saved = await load();
    assert.deepEqual(saved.events[0].completedDates, [DATE, NEXT]);
    assert.deepEqual(saved.events[0].excludedDates, [NEXT]);

    // Cancelling recurrence removal preserves both the original series and metadata.
    await page
      .getByRole("button", { name: TITLE + " 수정", exact: true })
      .click();
    await editor.getByLabel("반복 주기", { exact: true }).selectOption("none");
    await editor
      .getByRole("button", { name: L.SAVE, exact: true })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "취소", exact: true })
      .click();
    assert.deepEqual(await load(), saved);
    await editor.getByRole("button", { name: "취소", exact: true }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "변경 버리기", exact: true })
      .click();
    await editor.waitFor({ state: "hidden" });

    // Legacy global completion is unchanged until the user explicitly resumes it.
    await page
      .getByRole("checkbox", {
        name: "가상 기존 전체 완료 전체 완료 해제",
        exact: true,
      })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "취소", exact: true })
      .click();
    assert.equal(
      (await load()).events.find((e) => e.id === "legacy").done,
      true,
    );
    await page
      .getByRole("checkbox", {
        name: "가상 기존 전체 완료 전체 완료 해제",
        exact: true,
      })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "전체 완료 해제", exact: true })
      .click();
    await page.waitForFunction(() =>
      window.workdesk
        .load()
        .then((d) => !d.events.find((e) => e.id === "legacy").done),
    );
    saved = await load();

    // Actual whole-data backup/restore and process restart retain all recurrence metadata.
    const backup = path.join(dir, "recurrence-backup.json");
    await app.evaluate(({ dialog }, file) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: file });
    }, backup);
    await manage("백업");
    await fillBackupPassword(page, backup);
    assert.deepEqual(await store.readBackup(backup, TEST_PASSWORD), saved);
    await page.evaluate((value) => window.workdesk.save(value), empty());
    await page.reload();
    await page.locator('.save-indicator[data-state="ready"]').waitFor();
    await app.evaluate(({ dialog }, file) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [file],
      });
      dialog.showMessageBox = async () => ({ response: 1 });
    }, backup);
    await manage("복원");
    await fillRestorePassword(page);
    await page.waitForFunction(() =>
      window.workdesk
        .load()
        .then((d) => d.events.some((e) => e.id === "repeat")),
    );
    assert.deepEqual(await load(), saved);
    await app.close();
    app = null;
    await launch();
    assert.deepEqual(await load(), saved);
    console.log(
      "PASS: 회차별 완료·다음 알림 유지·브리핑/TXT, 제외/복원·완료 보존, 날짜 맥락·메타 수정 보존·반복 해제 취소, 기존 전체완료 명시 재개, 실제 백업/복원·재실행",
    );
  } catch (error) {
    failed = true;
    // Print the real failure first; a cleanup error below must not hide it.
    console.error("반복 일정 검사 본문 실패:", error);
    throw error;
  } finally {
    if (app) {
      if (failed) await app.evaluate(({ app }) => app.exit(1)).catch(() => {});
      else await app.close();
    }
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
