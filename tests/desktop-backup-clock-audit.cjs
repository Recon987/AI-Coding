// BACKUP-02 독립 감사: 과거 잘못 맞춘 PC 시계로 미래 시각 보호본이 남아 있는 상황.
// OS 시계를 바꾸지 않고 임시 프로필의 보호본 이름으로 조건을 재현한다.
const { _electron: electron } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const store = require("../desktop/store.cjs");
const root = path.resolve(__dirname, "..");
const output = path.resolve(process.env.PARK_BACKUP_AUDIT_DIR || path.join(os.tmpdir(), "park-backup-clock-audit"));
const sample = title => ({ ...store.empty(), notes: [{ id: "n1", title, body: "가상 자료" }] });

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "park-backup-clock-"));
  const profile = path.join(dir, "profile"), file = path.join(profile, "workdesk.json"), backup = path.join(dir, "backup.json");
  const original = sample("가상 이번 복원 직전 자료"), restored = sample("가상 가져올 백업 자료");
  const report = { reference: "afc3825", cases: [] };
  let app;
  fs.mkdirSync(output, { recursive: true });
  try {
    store.write(file, original, { keepLastGood: true });
    store.write(backup, restored);
    app = await electron.launch({
      executablePath: process.env.PARK_TEST_EXECUTABLE || require("electron"),
      args: [...(process.platform === "linux" ? ["--no-sandbox", "--ozone-platform=headless"] : []),
        "--user-data-dir=" + profile, ...(process.env.PARK_TEST_EXECUTABLE ? [] : [root])],
      env: { ...process.env, XDG_CONFIG_HOME: path.join(dir, "config") }, timeout: 30000,
    });
    const page = await app.firstWindow();
    page.setDefaultTimeout(8000);
    await page.locator('.save-indicator[data-state="ready"]').waitFor();
    for (const mode of ["past-copies", "future-copies"]) {
      await page.evaluate(d => window.workdesk.save(d), original);
      await page.reload();
      await page.locator('.save-indicator[data-state="ready"]').waitFor();
      for (const copy of store.restoreCopies(file)) fs.unlinkSync(copy.file);
      const start = mode === "past-copies" ? Date.UTC(2020, 0, 1) : Date.now() + 365 * 86400000;
      const seeded = Array.from({ length: 5 }, (_, i) => `${file}.before-restore-${start + i * 60000}.json`);
      for (const [index, copy] of seeded.entries()) store.write(copy, sample(`가상 기존 보호본 ${index + 1}`));
      await app.evaluate(({ dialog }, backup) => {
        dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [backup] });
        dialog.showMessageBox = async (...args) => {
          globalThis.__clockPrompt = args.at(-1);
          return { response: 1 };
        };
      }, backup);
      await page.locator(".data-menu > summary").click();
      await page.locator(".data-menu").getByRole("button", { name: "복원", exact: true }).click();
      await page.getByRole("status").filter({ hasText: "백업 자료를 복원했습니다" }).waitFor();
      const copies = store.restoreCopies(file);
      const result = {
        mode, passed: false,
        prompt: await app.evaluate(() => globalThis.__clockPrompt.detail),
        restored: JSON.stringify(store.read(file)) === JSON.stringify(restored),
        lastGoodRestored: JSON.stringify(store.read(store.lastGoodFile(file))) === JSON.stringify(restored),
        retained: copies.map(c => ({ name: path.basename(c.file), title: store.read(c.file).notes[0].title })),
        originalProtected: copies.some(c => JSON.stringify(store.read(c.file)) === JSON.stringify(original)),
        oldCopiesKept: seeded.filter(p => fs.existsSync(p)).length,
      };
      report.cases.push(result);
      try {
        assert.equal(result.restored && result.lastGoodRestored, true);
        assert.equal(copies.length, 5);
        assert.equal(result.originalProtected, true, "이번 복원 직전 자료를 새 보호본에 남겨야 함");
        result.passed = true;
      } catch (e) { result.failure = e.message; }
    }
  } finally {
    if (app) await app.close().catch(() => {});
    fs.rmSync(dir, { recursive: true, force: true });
    fs.writeFileSync(path.join(output, "results.json"), JSON.stringify(report, null, 2) + "\n");
  }
  console.log(JSON.stringify(report, null, 2));
  if (report.cases.some(c => !c.passed)) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1; });
