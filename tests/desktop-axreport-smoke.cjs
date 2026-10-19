// TASK-AXDESK-03: 보고서 초안 in the real app — opened from a project row, preview = copied text
// = saved file (built again by the main process from saved data), TXT with BOM / MD without,
// cancel writes nothing, and export-ax-report accepts only { projectId, format }.
// Build first: npm run build && node tests/desktop-axreport-smoke.cjs
const { _electron: electron } = require("playwright");
const { goTo } = require("./nav.cjs");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const store = require("../desktop/store.cjs");
const { buildAxReport } = require("../shared/ax-report.mjs");

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
  await page.locator('.save-indicator[data-state="ready"]').waitFor();
  // The report date comes from the main process's real clock (it writes the file), so the
  // test reads "today" there instead of freezing only the window's clock.
  const today = await app.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  return { app, page, today };
}
const project = (id, title, over = {}) => ({
  id, title, zone: "north", stage: "contract", budgetTotal: 50000, budgetExecuted: 56500, manager: "가상 담당",
  partner: "", nextMilestone: "계약 변경 협의", nextMilestoneDate: "2026-10-28", risks: "가상 위험\n둘째 줄", notes: "",
  updatedAt: "2026-10-19T00:00:00.000Z", ...over,
});

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "park-axreport-smoke-"));
  const profile = path.join(dir, "profile");
  const out = path.join(dir, "out");
  fs.mkdirSync(profile, { recursive: true });
  fs.mkdirSync(out);
  const file = path.join(profile, "workdesk.json");
  const data = store.empty();
  data.axProjects.push(project("a1", "가상 GIS: 통합/지도"), project("a2", "가상 드론 실증", { budgetTotal: 0, budgetExecuted: 0 }));
  store.write(file, data);
  let app;
  try {
    let page, today;
    ({ app, page, today } = await launch(dir, profile));
    const expected = (projectId, format) => buildAxReport(store.read(file), { projectId, format }, today);
    const preview = page.locator(".report-preview");
    const status = page.locator(".ax-report .list-count");
    // The main process's save dialog answers with a path the test chooses (or cancels).
    const answer = (filePath) =>
      app.evaluate(({ dialog }, target) => {
        globalThis.__axDialogs = [];
        dialog.showSaveDialog = async (_win, options) => {
          globalThis.__axDialogs.push(options);
          return target ? { canceled: false, filePath: target } : { canceled: true };
        };
      }, filePath);

    // 1. From the project row, with that project chosen; the preview is the shared template.
    await goTo(page, "AX 사업 관리");
    await page.getByRole("button", { name: "보고서 · 가상 GIS: 통합/지도", exact: true }).click();
    await page.getByRole("heading", { level: 1, name: "보고서 초안", exact: true }).waitFor();
    assert.equal(await page.getByLabel("사업", { exact: true }).inputValue(), "a1");
    const txt = expected("a1", "txt");
    assert.equal(await preview.textContent(), txt.content);
    assert.equal(await page.locator(".report-filename").textContent(), `AX사업보고서초안-가상 GIS 통합 지도-${today}.txt`);
    assert.match(txt.content, /집행률 113% \(사업비보다 6,500천원 많음 — 확인 필요\)/);
    assert.match(txt.content, /협력기관: \[작성 필요\]/);
    await page.getByText("공식 서식이 아니며 온라인 AI를 쓰지 않습니다.", { exact: false }).waitFor();

    // 2. Copy gives exactly the preview.
    await page.getByRole("button", { name: "초안 복사", exact: true }).click();
    await status.filter({ hasText: "보고서 초안을 복사했습니다." }).waitFor();
    // Windows keeps clipboard text with CRLF line ends (Chromium converts \n on copy); only those may differ.
    const copied = await app.evaluate(({ clipboard }) => clipboard.readText());
    assert.equal(process.platform === "win32" ? copied.replace(/\r\n/g, "\n") : copied, txt.content);

    // 3. Save TXT: suggested name, BOM + the same text, owner-only permissions where supported.
    const txtPath = path.join(out, "report.txt");
    await answer(txtPath);
    await page.getByRole("button", { name: "파일로 저장", exact: true }).click();
    await status.filter({ hasText: "보고서 초안을 TXT 파일로 저장했습니다." }).waitFor();
    const dialogs = await app.evaluate(() => globalThis.__axDialogs);
    assert.equal(dialogs[0].defaultPath, txt.filename);
    assert.deepEqual(dialogs[0].filters, [{ name: "텍스트", extensions: ["txt"] }]);
    assert.equal(fs.readFileSync(txtPath, "utf8"), "\ufeff" + txt.content);
    if (process.platform !== "win32") assert.equal(fs.statSync(txtPath).mode & 0o777, 0o600);

    // 4. Another project in Markdown: no BOM, same text as its preview.
    await page.getByLabel("사업", { exact: true }).selectOption("a2");
    await page.getByLabel("형식", { exact: true }).selectOption("md");
    const md = expected("a2", "md");
    await page.waitForFunction((text) => document.querySelector(".report-preview")?.textContent === text, md.content);
    assert.match(md.content, /^# AX 사업 보고서 초안 — 가상 드론 실증\n/);
    assert.match(md.content, /사업비 미등록이라 집행률 계산 안 함/);
    const mdPath = path.join(out, "report.md");
    await answer(mdPath);
    await page.getByRole("button", { name: "파일로 저장", exact: true }).click();
    await status.filter({ hasText: "보고서 초안을 MD 파일로 저장했습니다." }).waitFor();
    assert.equal(fs.readFileSync(mdPath, "utf8"), md.content);

    // 5. Cancel writes nothing and says nothing.
    await answer(null);
    const cancelled = await page.evaluate(() => window.workdesk.exportAxReport({ projectId: "a1", format: "txt" }));
    assert.equal(cancelled, false);
    assert.deepEqual(fs.readdirSync(out).sort(), ["report.md", "report.txt"]);

    // 6. The channel takes only the project ID and format; content or paths cannot be sent.
    await answer(path.join(out, "should-not-exist.txt"));
    for (const [request, message] of [
      [{ projectId: "a1", format: "txt", path: "C:/x.txt" }, /요청을 확인/],
      [{ projectId: "a1", format: "txt", content: "가짜 본문" }, /요청을 확인/],
      [{ projectId: "a1", format: "html" }, /TXT 또는 MD/],
      [{ projectId: "없는-사업", format: "txt" }, /사업을 찾을 수 없습니다/],
    ])
      await assert.rejects(page.evaluate((r) => window.workdesk.exportAxReport(r), request), message);
    assert.equal(fs.existsSync(path.join(out, "should-not-exist.txt")), false);
    assert.deepEqual(await app.evaluate(() => globalThis.__axDialogs.length), 0, "거부된 요청은 대화상자도 열지 않음");
    console.log("PASS: 사업 행에서 보고서 초안 열기, 미리보기=복사=저장 파일(본체가 저장 자료로 다시 생성), TXT BOM·MD 무BOM·0600, 예산 미등록·초과 집행 문구, 취소 무저장, export-ax-report 요청 검증(경로·본문·형식·없는 사업 거부)");
  } finally {
    if (app) await app.close().catch(() => {});
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
