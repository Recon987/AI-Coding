// 독립 감사: npm run build 후 node tests/desktop-data-safety-audit.cjs
// 기존 스모크·IPC를 바꾸지 않는다. 오류 주입은 이 임시 앱의 본체 프로세스에서만 한다.
const { _electron: electron } = require("playwright");
const { goTo } = require("./nav.cjs");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const store = require("../desktop/store.cjs");
const { addLabel } = require("../shared/labels.mjs");
const root = path.resolve(__dirname, "..");
const output = path.resolve(process.env.PARK_DATA_AUDIT_DIR || path.join(os.tmpdir(), "park-data-safety-audit"));
const sample = title => ({ ...store.empty(), notes: [{ id: "audit-note", title, body: "실제 개인정보 없는 가상 자료" }] });

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "park-data-desktop-audit-"));
  const profile = path.join(dir, "profile"), file = path.join(profile, "workdesk.json");
  const original = sample("가상 복원 전 메모"), restored = sample("가상 백업에서 복원한 메모");
  const backup = path.join(dir, "backup.json"), badBackup = path.join(dir, "invalid.json");
  const report = { baseline: "20cdc3c4431f7d055397d61aef3ab6fe982e9e9a", platform: process.platform, cases: [], errors: [], externalRequests: [] };
  let app;
  fs.mkdirSync(output, { recursive: true });
  try {
    store.write(file, original, { keepLastGood: true });
    store.write(backup, restored);
    fs.writeFileSync(badBackup, "{broken");
    app = await electron.launch({
      executablePath: process.env.PARK_TEST_EXECUTABLE || require("electron"),
      args: [...(process.platform === "linux" ? ["--no-sandbox", "--ozone-platform=headless"] : []),
        "--user-data-dir=" + profile, ...(process.env.PARK_TEST_EXECUTABLE ? [] : [root])],
      env: { ...process.env, XDG_CONFIG_HOME: path.join(dir, "config") }, timeout: 30000,
    });
    const page = await app.firstWindow();
    page.setDefaultTimeout(8000);
    page.on("pageerror", e => report.errors.push(e.message));
    page.context().on("request", r => { if (/^https?:/.test(r.url())) report.externalRequests.push(r.url()); });
    await page.locator('.save-indicator[data-state="ready"]').waitFor();
    const navNotes = async () => {
      await goTo(page, "업무 메모");
      await page.getByRole("heading", { name: "업무 메모", level: 1 }).waitFor();
    };
    const undoInjection = async () => app.evaluate(() => {
      const fs = process.mainModule.require("node:fs");
      if (globalThis.__auditReadDir) fs.readdirSync = globalThis.__auditReadDir;
      if (globalThis.__auditRename) fs.renameSync = globalThis.__auditRename;
      delete globalThis.__auditReadDir;
      delete globalThis.__auditRename;
    });
    for (const mode of ["success", "cancel", "invalid", "before-commit", "after-commit-listing"]) {
      const result = { mode, passed: false };
      report.cases.push(result);
      try {
        await undoInjection();
        await page.evaluate(data => window.workdesk.save(data), original);
        await page.reload();
        await page.locator('.save-indicator[data-state="ready"]').waitFor();
        await navNotes();
        // 기존 보호본은 읽을 수 있는 가상 JSON으로 채운다.
        for (const copy of store.restoreCopies(file)) fs.unlinkSync(copy.file);
        for (let at = 1; at <= 5; at++) store.write(`${file}.before-restore-${at}.json`, original);
        const before = fs.readFileSync(file), goodBefore = fs.readFileSync(store.lastGoodFile(file));
        await app.evaluate(({ dialog }, config) => {
          const fs = process.mainModule.require("node:fs");
          dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [config.picked] });
          dialog.showMessageBox = async () => ({ response: config.mode === "cancel" ? 0 : 1 });
          if (config.mode === "before-commit") {
            globalThis.__auditRename = fs.renameSync;
            fs.renameSync = (from, to) => {
              if (to === config.file) throw Object.assign(new Error("감사 ENOSPC"), { code: "ENOSPC" });
              return globalThis.__auditRename(from, to);
            };
          }
          if (config.mode === "after-commit-listing") {
            globalThis.__auditReadDir = fs.readdirSync;
            let reads = 0;
            fs.readdirSync = (target, ...args) => {
              if (String(target) === config.profile && ++reads >= 2)
                throw Object.assign(new Error("감사 EACCES: 복원 후 보호본 목록 읽기 실패"), { code: "EACCES" });
              return globalThis.__auditReadDir(target, ...args);
            };
          }
        }, { mode, file, profile, picked: mode === "invalid" ? badBackup : backup });
        await page.locator(".data-menu > summary").click();
        await page.locator(".data-menu").getByRole("button", { name: "복원", exact: true }).click();
        await page.locator('.save-indicator[data-state="ready"]').waitFor();
        if (mode === "success") await page.getByRole("status").filter({ hasText: "백업 자료를 복원했습니다" }).waitFor();
        if (mode === "invalid" || mode === "before-commit") await page.getByRole("alert").waitFor();
        if (mode === "after-commit-listing") {
          await page.waitForFunction(() => !!document.querySelector('[role="alert"]') || document.querySelector('[role="status"]')?.textContent.includes("백업 자료를 복원했습니다"));
        }
        await undoInjection();
        result.diskAfterRestore = store.read(file).notes.map(n => n.title);
        result.visibleAfterRestore = await page.locator(".row-main h3").allTextContents();
        result.alert = await page.getByRole("alert").allTextContents();
        result.protectionCopies = store.restoreCopies(file).length;
        if (mode === "success") {
          assert.deepEqual(store.read(file), restored);
          assert.deepEqual(store.read(store.lastGoodFile(file)), restored);
          assert.equal(result.protectionCopies, 5);
          await navNotes();
          result.visibleAfterRestore = await page.locator(".row-main h3").allTextContents();
          assert.deepEqual(result.visibleAfterRestore, restored.notes.map(n => n.title));
        } else if (mode !== "after-commit-listing") {
          assert.deepEqual(fs.readFileSync(file), before, "확정 전 실패/취소의 원본 바이트");
          assert.deepEqual(fs.readFileSync(store.lastGoodFile(file)), goodBefore);
          assert.ok([5, 6].includes(result.protectionCopies));
          assert.deepEqual(result.visibleAfterRestore, original.notes.map(n => n.title));
        } else {
          assert.deepEqual(store.read(file), restored, "복원 본체는 이미 확정됨");
          await page.screenshot({ path: path.join(output, "after-commit-listing.png") });
          // 화면과 디스크 불일치가 다음 정상 저장에서 실제 손실로 이어지는지 확인한다.
          await navNotes();
          await page.getByRole("button", { name: addLabel("메모"), exact: true }).click();
          await page.getByLabel("제목", { exact: true }).fill("가상 복원 직후 추가 메모");
          await page.getByRole("button", { name: "저장", exact: true }).click();
          await page.locator(".sheet[open]").waitFor({ state: "hidden" });
          result.diskAfterNextSave = store.read(file).notes.map(n => n.title);
          result.lastGoodAfterNextSave = store.read(store.lastGoodFile(file)).notes.map(n => n.title);
          result.backupUnchanged = JSON.stringify(store.read(backup)) === JSON.stringify(restored);
          assert.ok(result.diskAfterNextSave.includes(restored.notes[0].title), "복원 후 정상 저장이 복원된 기록을 지우면 안 됨");
        }
        result.passed = true;
      } catch (error) { result.failure = error.message; }
      finally { await undoInjection(); }
    }
  } finally {
    if (app) await app.close().catch(() => {});
    fs.rmSync(dir, { recursive: true, force: true });
    fs.writeFileSync(path.join(output, "desktop-results.json"), JSON.stringify(report, null, 2) + "\n");
  }
  console.log(JSON.stringify(report, null, 2));
  if (report.cases.some(r => !r.passed) || report.errors.length || report.externalRequests.length) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
