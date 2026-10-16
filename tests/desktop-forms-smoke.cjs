// TASK-FORMS-01: preview and save recommended forms through the real main process.
// Only the OS save dialog is answered; the file is written by the app itself.
// Build first: npm run build && node tests/desktop-forms-smoke.cjs
const { _electron: electron } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { empty } = require("../shared/model.mjs");

const root = path.resolve(__dirname, "..");
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "park-forms-smoke-"));
  let app;
  try {
    app = await electron.launch({
      executablePath: process.env.PARK_TEST_EXECUTABLE || require("electron"),
      args: [
        ...(process.platform === "linux" ? ["--no-sandbox", "--ozone-platform=headless"] : []),
        "--user-data-dir=" + path.join(dir, "profile"),
        ...(process.env.PARK_TEST_EXECUTABLE ? [] : [root]),
      ],
      env: { ...process.env, TZ: "Asia/Seoul", XDG_CONFIG_HOME: path.join(dir, "config") },
      timeout: 30000,
    });
    const page = await app.firstWindow();
    page.setDefaultTimeout(8000);
    await page.clock.install({ time: new Date("2026-10-15T18:00:00+09:00") });
    await page.locator("main h1").waitFor();
    const data = empty();
    data.patrols.push({
      id: "p1",
      title: "가상 계곡 단속 순찰",
      at: "2026-10-15T01:00:00.000Z",
      route: "가상 안내소 → 쉼터",
      observer: "가상 담당",
      findings: "",
      action: "",
      risk: "attention",
      kind: "enforcement",
      zone: "3-2",
      observations: [
        { id: "o1", type: "샛길·출입금지구역 출입", count: 2, outcome: "guidance", note: "", coordinates: { latitude: 37.6512, longitude: 126.9771 } },
        { id: "o2", type: "=HYPERLINK(\"x\")", count: 1, outcome: "fine", note: "" },
      ],
    });
    await page.evaluate((value) => window.workdesk.save(value), data);
    await page.reload();
    await page.locator('.save-indicator[data-state="ready"]').waitFor();

    await page.locator("nav").getByRole("button", { name: "현장 순찰", exact: true }).click();
    await page.getByRole("button", { name: "양식 출력", exact: true }).click();
    const preview = page.getByLabel("양식 미리보기");
    await preview.waitFor();
    assert.match(await preview.textContent(), /^순찰일지 \| 2026-10-12 ~ 2026-10-18\n추천 양식 · 공식 서식 아님/);
    assert.match(await preview.textContent(), /가상 계곡 단속 순찰/);

    await page.getByLabel("양식", { exact: true }).selectOption("enforcement-log");
    assert.match(await preview.textContent(), /샛길·출입금지구역 출입 2건 \| 계도/);
    await page.getByLabel("CSV · 엑셀 편집").check();
    const target = path.join(dir, "out.csv");
    await app.evaluate(({ dialog }, file) => {
      dialog.showSaveDialog = async (_win, options) => {
        globalThis.__parkSaveOptions = options;
        return { canceled: false, filePath: file };
      };
    }, target);
    await page.getByRole("button", { name: "파일로 저장", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "CSV 파일로 저장했습니다" }).waitFor();
    const options = await app.evaluate(() => globalThis.__parkSaveOptions);
    assert.equal(options.defaultPath, "단속-계도 기록-2026-10-12_2026-10-18.csv");
    const bytes = fs.readFileSync(target);
    assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf], "UTF-8 BOM");
    const lines = bytes.toString("utf8").slice(1).trimEnd().split("\r\n");
    assert.equal(lines.length, 3);
    assert.match(lines[1], /"샛길·출입금지구역 출입","2","계도","37\.6512","126\.9771"/);
    assert.match(lines[2], /"'=HYPERLINK\(""x""\)"/);

    // The main process builds content itself and refuses anything but the four fields.
    const refused = await page.evaluate(() =>
      window.workdesk
        .exportForm({ form: "patrol-log", startDate: "2026-10-01", endDate: "2026-10-02", format: "txt", path: "C:/x.txt" })
        .then(() => "accepted", (error) => error.message),
    );
    assert.match(refused, /요청을 확인/);
    const badRange = await page.evaluate(() =>
      window.workdesk
        .exportForm({ form: "patrol-log", startDate: "2026-10-02", endDate: "2026-10-01", format: "txt" })
        .then(() => "accepted", (error) => error.message),
    );
    assert.match(badRange, /시작일은 종료일보다/);
    console.log("PASS: 양식 출력 미리보기(순찰일지·단속·계도 기록), CSV 저장(BOM·수식 차단·파일명), 잘못된 요청 거부");
  } finally {
    if (app) await app.close().catch(() => {});
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
