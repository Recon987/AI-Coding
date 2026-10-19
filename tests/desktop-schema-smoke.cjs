// TASK-SCHEMA-01: a newer app's file opens read-only in the real app and is never written;
// a current file keeps top-level keys this version does not know through a UI save.
// Build first: npm run build && node tests/desktop-schema-smoke.cjs
const { _electron: electron } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const store = require("../desktop/store.cjs");
const { READER_VERSION } = require("../shared/model.mjs");
// Button wording comes from the app (TASK-LABELS-01 U6).
const L = require("../shared/labels.mjs");

const root = path.resolve(__dirname, "..");
async function launch(dir, profile) {
  const app = await electron.launch({
    executablePath: process.env.PARK_TEST_EXECUTABLE || require("electron"),
    args: [
      ...(process.platform === "linux" ? ["--no-sandbox", "--ozone-platform=headless"] : []),
      "--user-data-dir=" + profile,
      ...(process.env.PARK_TEST_EXECUTABLE ? [] : [root]),
    ],
    env: { ...process.env, TZ: "Asia/Seoul", XDG_CONFIG_HOME: path.join(dir, "config") },
    timeout: 30000,
  });
  const page = await app.firstWindow();
  page.setDefaultTimeout(8000);
  return { app, page };
}
const sample = (extra) => {
  const data = store.empty();
  data.notes.push({ id: "n1", title: "가상 보존 메모", body: "가상 자료" });
  return { ...data, ...extra };
};
const future = { inspections: [{ id: "i1", facility: "가상 데크" }] };

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "park-schema-smoke-"));
  let app;
  try {
    // 1. A newer app's file: shown, never saved, backed up or restored from here.
    const newerProfile = path.join(dir, "newer");
    fs.mkdirSync(newerProfile, { recursive: true });
    const newerFile = path.join(newerProfile, "workdesk.json");
    const raw = JSON.stringify(sample({ minReader: READER_VERSION + 1, ...future }), null, 2);
    fs.writeFileSync(newerFile, raw);
    let newer;
    ({ app, page: newer } = await launch(dir, newerProfile));
    await newer.locator('.save-indicator[data-state="read-only"]').waitFor();
    assert.equal((await newer.locator(".save-indicator").textContent()).trim(), "읽기 전용");
    assert.match(await newer.locator(".read-only-notice").textContent(), /^읽기 전용: 이 자료는 더 새 버전/);
    assert.equal(await newer.locator(".read-only-notice").getAttribute("role"), "alert");
    await newer.locator("nav").getByRole("button", { name: "업무 메모", exact: true }).click();
    await newer.getByRole("heading", { name: "가상 보존 메모", exact: true }).waitFor();
    await newer.getByRole("button", { name: L.addLabel(L.TARGET.note), exact: true }).click();
    await newer.getByLabel("제목", { exact: true }).fill("저장되면 안 되는 메모");
    await newer.getByRole("button", { name: "저장", exact: true }).click();
    await newer.getByRole("alert").filter({ hasText: "읽기 전용 자료라 저장" }).waitFor();
    // The draft stays open so nothing typed is lost.
    assert.equal(await newer.getByLabel("제목", { exact: true }).inputValue(), "저장되면 안 되는 메모");
    // The main process refuses too, whatever the renderer does.
    const direct = await newer.evaluate(async () => {
      const data = await window.workdesk.load();
      const results = [];
      for (const call of [() => window.workdesk.save({ ...data, minReader: undefined }), () => window.workdesk.backup(), () => window.workdesk.restore()])
        results.push(await call().then(() => "ok", (error) => error.message));
      return results;
    });
    for (const message of direct) assert.match(message, /더 새 버전/, message);
    // Discard the unsaved draft first: on Windows the close guard shows a native
    // dialog that would block app.close() (seen in Actions run 39187832768).
    await newer.keyboard.press("Escape");
    await newer.getByRole("alertdialog").getByRole("button", { name: "변경 버리기", exact: true }).click();
    await newer.locator(".sheet[open]").waitFor({ state: "hidden" });
    await app.close();
    app = undefined;
    assert.equal(fs.readFileSync(newerFile, "utf8"), raw, "새 버전 파일은 바이트 그대로");
    assert.deepEqual(fs.readdirSync(newerProfile).filter((f) => f.startsWith("workdesk.json")), ["workdesk.json"], "손상 사본·보호본·변환 백업 없음");

    // 2. A current file with keys from a newer app keeps them through a UI save.
    const currentProfile = path.join(dir, "current");
    const currentFile = path.join(currentProfile, "workdesk.json");
    store.write(currentFile, sample(future));
    let page;
    ({ app, page } = await launch(dir, currentProfile));
    await page.locator('.save-indicator[data-state="ready"]').waitFor();
    assert.equal(await page.locator(".read-only-notice").count(), 0);
    await page.locator("nav").getByRole("button", { name: "업무 메모", exact: true }).click();
    await page.getByRole("button", { name: /^수정 · 가상 보존 메모$/ }).click();
    await page.getByLabel("제목", { exact: true }).fill("고친 보존 메모");
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await page.locator(".sheet[open]").waitFor({ state: "hidden" });
    const saved = JSON.parse(fs.readFileSync(currentFile, "utf8"));
    assert.equal(saved.notes[0].title, "고친 보존 메모");
    assert.deepEqual(saved.inspections, future.inspections, "모르는 최상위 항목 보존");
    assert.equal(Object.hasOwn(saved, "minReader"), false);
    console.log("PASS: 새 버전 자료 읽기 전용(표시·저장/백업/복원 거부·파일 불변·손상 처리 없음), 모르는 최상위 항목 저장 후 보존");
  } finally {
    if (app) await app.close().catch(() => {});
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
