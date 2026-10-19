// TASK-POLISH-01: a failed protection copy at startup or after restore is shown on screen,
// not only logged. A directory at the copy's temporary path makes that write fail.
// Build first: npm run build && node tests/desktop-notice-smoke.cjs
const { _electron: electron } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const store = require("../desktop/store.cjs");

const root = path.resolve(__dirname, "..");
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "park-notice-smoke-"));
  const profile = path.join(dir, "profile");
  const file = path.join(profile, "workdesk.json");
  const blocker = store.lastGoodFile(file) + ".tmp";
  const data = store.empty();
  data.notes.push({ id: "n1", title: "가상 메모", body: "가상 자료" });
  store.write(file, data);
  fs.mkdirSync(blocker);
  let app;
  try {
    app = await electron.launch({
      executablePath: process.env.PARK_TEST_EXECUTABLE || require("electron"),
      args: [
        ...(process.platform === "linux" ? ["--no-sandbox", "--ozone-platform=headless"] : []),
        "--user-data-dir=" + profile,
        ...(process.env.PARK_TEST_EXECUTABLE ? [] : [root]),
      ],
      env: { ...process.env, XDG_CONFIG_HOME: path.join(dir, "config") },
      timeout: 30000,
    });
    const page = await app.firstWindow();
    page.setDefaultTimeout(8000);
    const alert = page.getByRole("alert");
    await alert.filter({ hasText: /마지막 정상본\(자동 보호본\)을 만들지 못했습니다/ }).waitFor();
    assert.deepEqual(store.read(file), data, "주 파일은 그대로");
    assert.equal(fs.existsSync(store.lastGoodFile(file)), false);
    // Shown once: a reload does not repeat a warning that was already delivered.
    await page.reload();
    await page.locator('.save-indicator[data-state="ready"]').waitFor();
    assert.equal(await alert.count(), 0);

    // Restore commits the primary file, then the protection copy fails again.
    const backup = path.join(dir, "backup.json");
    const restored = store.empty();
    restored.notes.push({ id: "n2", title: "복원 메모", body: "가상 백업" });
    store.write(backup, restored);
    // TASK-BACKUP-02: five older protection copies exist; the restore keeps the newest five.
    const oldCopies = [1, 2, 3, 4, 5].map((n) => `${file}.before-restore-${Date.UTC(2026, 0, n)}.json`);
    for (const copy of oldCopies) fs.writeFileSync(copy, "{}");
    await app.evaluate(({ dialog }, picked) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [picked] });
      dialog.showMessageBox = async (...args) => {
        globalThis.__restorePrompt = args.at(-1);
        return { response: 1 };
      };
    }, backup);
    await page.locator(".data-menu > summary").click();
    await page.locator(".data-menu").getByRole("button", { name: "복원", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "백업 자료를 복원했습니다" }).waitFor();
    await alert.filter({ hasText: /자료는 저장했지만 자동 보호본을 갱신하지 못했습니다/ }).waitFor();
    assert.deepEqual(store.read(file), restored);
    const prompt = await app.evaluate(() => globalThis.__restorePrompt);
    assert.match(prompt.detail, /최근 5개만 보관/);
    // Shown in the PC's local time, so the UTC midnight copy may read as the previous day.
    assert.match(prompt.detail, /가장 오래된 보호본 1개\((2026-01-01|2025-12-31) \d{2}:\d{2}\)를 지웁니다/);
    const left = store.restoreCopies(file);
    assert.equal(left.length, 5, "복원 뒤 보호본 5개");
    assert.equal(fs.existsSync(oldCopies[0]), false, "가장 오래된 것만 정리");
    assert.ok(oldCopies.slice(1).every((copy) => fs.existsSync(copy)));
    assert.deepEqual(JSON.parse(fs.readFileSync(left.at(-1).file, "utf8")), data, "새 보호본은 복원 전 자료");

    // Once the cause is gone the next save refreshes the copy.
    fs.rmdirSync(blocker);
    await page.evaluate(async () => {
      const current = await window.workdesk.load();
      await window.workdesk.save(current);
    });
    assert.deepEqual(store.read(store.lastGoodFile(file)), restored);
    console.log("PASS: 시작 시 보호본 준비 실패·복원 직후 보호본 실패를 화면 경고로 표시(1회), 복원 보호본 최근 5개 유지(확인창 안내 뒤 정리)");
  } finally {
    if (app) await app.close().catch(() => {});
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
