// HOLIDAY-01 독립 경계 감사. npm run build 후 node tests/desktop-holiday-limits-audit.cjs
// 현재 공휴일 1,000개 상태에서 직접 등록/붙여 넣기가 안전하게 거부되는지 확인한다.
const { _electron: electron } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { empty } = require("../shared/model.mjs");
const { addLabel, TARGET } = require("../shared/labels.mjs");
const root = path.resolve(__dirname, "..");
const output = path.resolve(process.env.PARK_HOLIDAY_AUDIT_DIR || path.join(os.tmpdir(), "park-holiday-limits-audit"));

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "park-holiday-limits-"));
  const report = { reference: "afc3825", cases: [], externalRequests: [] };
  let app;
  fs.mkdirSync(output, { recursive: true });
  try {
    app = await electron.launch({
      executablePath: process.env.PARK_TEST_EXECUTABLE || require("electron"),
      args: [...(process.platform === "linux" ? ["--no-sandbox", "--ozone-platform=headless"] : []),
        "--user-data-dir=" + path.join(dir, "profile"), ...(process.env.PARK_TEST_EXECUTABLE ? [] : [root])],
      env: { ...process.env, XDG_CONFIG_HOME: path.join(dir, "config") }, timeout: 30000,
    });
    const page = await app.firstWindow();
    page.setDefaultTimeout(8000);
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    page.context().on("request", r => { if (/^https?:/.test(r.url())) report.externalRequests.push(r.url()); });
    await page.locator('.save-indicator[data-state="ready"]').waitFor();
    const data = empty();
    data.customHolidays = Array.from({ length: 1000 }, (_, i) => ({
      id: `limit-${i}`, date: new Date(Date.UTC(2027, 0, 1 + i, 12)).toISOString().slice(0, 10), name: "가상 휴무",
    }));
    await page.evaluate(d => window.workdesk.save(d), data);
    for (const mode of ["direct", "paste"]) {
      const result = { mode, passed: false };
      report.cases.push(result);
      await page.reload();
      await page.locator('.save-indicator[data-state="ready"]').waitFor();
      errors.length = 0;
      await page.locator(".data-menu > summary").click();
      await page.getByRole("button", { name: "공휴일 관리", exact: true }).click();
      const sheet = page.getByRole("dialog", { name: "공휴일 관리" });
      if (mode === "direct") {
        await sheet.getByLabel("날짜", { exact: true }).fill("2030-01-01");
        await sheet.getByLabel("이름", { exact: true }).fill("가상 초과");
        await sheet.getByRole("button", { name: addLabel(TARGET.holiday), exact: true }).click();
      } else {
        await sheet.getByText("여러 날을 한 번에 붙여 넣기", { exact: true }).click();
        await sheet.getByLabel("한 줄에 하나씩").fill("2030-01-01,가상 초과");
        await sheet.getByRole("button", { name: "붙여 넣은 목록 등록", exact: true }).click();
      }
      // 로컬 동기 검증 결과와 비동기 이벤트의 예외 전달이 끝난 뒤 측정한다.
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      result.unhandledErrors = [...errors];
      result.status = await sheet.getByRole("status").textContent();
      result.validation = await sheet.locator(".holiday-errors").allTextContents();
      result.dataUnchanged = JSON.stringify(await page.evaluate(() => window.workdesk.load())) === JSON.stringify(data);
      result.draft = mode === "direct" ? await sheet.getByLabel("이름", { exact: true }).inputValue() : await sheet.getByLabel("한 줄에 하나씩").inputValue();
      await page.screenshot({ path: path.join(output, `${mode}.png`) });
      try {
        assert.equal(result.dataUnchanged, true, "초과 입력이 기존 자료를 바꾸면 안 됨");
        assert.deepEqual(result.unhandledErrors, [], "한도 검증은 처리되지 않은 예외를 발생시키면 안 됨");
        assert.match(result.status + result.validation.join(" "), /1,?000|1천/, "한도 안내를 화면에 표시해야 함");
        assert.ok(result.draft.includes("가상 초과"), "거부 시 초안 보존");
        result.passed = true;
      } catch (e) { result.failure = e.message; }
    }
  } finally {
    if (app) await app.close().catch(() => {});
    fs.rmSync(dir, { recursive: true, force: true });
    fs.writeFileSync(path.join(output, "results.json"), JSON.stringify(report, null, 2) + "\n");
  }
  console.log(JSON.stringify(report, null, 2));
  if (report.cases.some(c => !c.passed) || report.externalRequests.length) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1; });
