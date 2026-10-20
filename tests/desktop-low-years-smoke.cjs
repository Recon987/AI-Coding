// TASK-AX-DATES-01: a valid but very early date (0099-10-21) keeps its year in the real app —
// calendar grid and AX chip, the out-of-table holiday note, the home day list and the briefing.
// Build first: npm run build && node tests/desktop-low-years-smoke.cjs
const { _electron: electron } = require("playwright");
const { goTo } = require("./nav.cjs");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const store = require("../desktop/store.cjs");

const root = path.resolve(__dirname, "..");
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "park-low-years-smoke-"));
  const profile = path.join(dir, "profile");
  fs.mkdirSync(profile, { recursive: true });
  const file = path.join(profile, "workdesk.json");
  const data = store.empty();
  data.axProjects.push({
    id: "a1", title: "가상 낮은 연도 사업", zone: "hq", stage: "planning", budgetTotal: 0, budgetExecuted: 0,
    manager: "", partner: "", nextMilestone: "가상 보고", nextMilestoneDate: "0099-10-21", risks: "", notes: "",
    updatedAt: "2026-10-19T00:00:00.000Z",
  });
  store.write(file, data);
  const raw = fs.readFileSync(file, "utf8");
  let app;
  try {
    app = await electron.launch({
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
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    // The window believes it is 0099-10-21, so every screen starts on that day.
    await page.clock.install({ time: new Date("0099-10-21T09:00:00+09:00") });
    await page.locator("main h1").waitFor();
    await page.reload();
    await page.locator('.save-indicator[data-state="ready"]').waitFor();

    // Home: the day list shows the milestone; the briefing text names the day and the project.
    await page.locator(".timeline-row").filter({ hasText: "가상 낮은 연도 사업 · 가상 보고" }).waitFor();
    await page.getByRole("button", { name: "브리핑 미리보기", exact: true }).click();
    const text = await page.locator("pre").first().textContent();
    assert.match(text, /^공원 업무 수첩 \| 0099-10-21 업무 브리핑/);
    assert.match(text, /AX 사업 마일스톤 \(1\)\n- 가상 낮은 연도 사업 \| 가상 보고 \| 본사 \| 기획/);

    // Calendar: the grid is October 0099 (not 1999), with the chip on the 21st and the note.
    await goTo(page, "월간 일정");
    await page.getByRole("grid", { name: "99년 10월", exact: true }).waitFor();
    const day = page.locator('.calendar-day[data-date="0099-10-21"]');
    await day.locator(".calendar-chip.ax").waitFor();
    assert.equal(await page.locator('.calendar-day[data-date^="1999-"]').count(), 0);
    assert.match(await page.locator(".calendar-note").textContent(), /공휴일 표\(1970~2100년\) 밖이라 기본 공휴일을 표시하지 않습니다/);

    // AX list shows the stored date unchanged, and nothing was written.
    await goTo(page, "AX 사업 관리");
    assert.match(await page.locator(".ax-record .row-when").first().textContent(), /^0099-10-21/);
    assert.equal(fs.readFileSync(file, "utf8"), raw, "열람만으로 자료를 바꾸지 않음");
    assert.deepEqual(errors, []);
    console.log("PASS: 0099-10-21 마일스톤 — 홈 목록·브리핑 문구, 달력 0099년 10월 격자·AX 칩·공휴일 표 범위 안내, AX 목록 날짜 그대로, 무저장·화면 오류 0");
  } finally {
    if (app) await app.close().catch(() => {});
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
