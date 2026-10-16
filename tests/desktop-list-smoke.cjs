// TASK-LIST-01: one primary button per screen, and ↑/↓ + Enter work across record rows.
// Build first: npm run build && node tests/desktop-list-smoke.cjs
const { _electron: electron } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { REVIEW_DATE, reviewFixture } = require("./review-fixture.cjs");

const root = path.resolve(__dirname, "..");
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "park-list-smoke-"));
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
    await page.clock.install({ time: new Date(`${REVIEW_DATE}T09:30:00+09:00`) });
    await page.locator("main h1").waitFor();
    const data = reviewFixture(REVIEW_DATE);
    data.controls = [
      { id: "c1", title: "가상 계곡 탐방로", zone: "3-2", reason: "weather", start: REVIEW_DATE, end: null, note: "" },
      { id: "c2", title: "가상 능선 탐방로", zone: null, reason: "fire", start: REVIEW_DATE, end: null, note: "" },
    ];
    await page.evaluate((value) => window.workdesk.save(value), data);
    await page.reload();
    await page.locator('.save-indicator[data-state="ready"]').waitFor();
    // TASK-HOME-02: status strip shows today's duty staff; tiles filter or navigate; week-only date moves.
    const strip = page.getByLabel("오늘 상태");
    assert.match(await strip.getByRole("button", { name: /^오늘 당직/ }).getAttribute("aria-label"), /^오늘 당직 (주간당직|숙직) 가상직원/);
    assert.match(await strip.getByRole("button", { name: /^오늘 통제/ }).getAttribute("aria-label"), /^오늘 통제 2곳: 가상 계곡 탐방로, 가상 능선 탐방로$/);
    await strip.getByRole("button", { name: /^기한 경과/ }).click();
    await page.locator(".segmented button.selected", { hasText: "기한 경과" }).waitFor();
    assert.equal(await page.getByLabel("브리핑 날짜").count(), 0, "날짜 입력칸 없음(주간 띠만)");
    await page.getByRole("button", { name: "다음 주", exact: true }).click();
    await page.getByRole("heading", { name: /^10\. 22\. \(목\) 기록$/ }).waitFor();
    await page.getByRole("button", { name: "오늘", exact: true }).click();
    await page.getByRole("heading", { name: "오늘의 일정과 기록" }).waitFor();
    const pages = ["현장 순찰", "탐방로 통제", "인수인계", "제출 기한", "전화메모", "업무 메모"];
    for (const name of pages) {
      await page.locator("nav").getByRole("button", { name, exact: true }).click();
      await page.getByRole("heading", { name, level: 1 }).waitFor();
      const primaries = await page.locator("main .primary:visible").count();
      assert.equal(primaries, 1, `${name}: 진한 버튼은 1개 (${primaries}개)`);
      const rows = page.locator(".row-list .list-row > .record-details > summary");
      assert.ok((await rows.count()) >= 2, `${name}: 행이 2개 이상`);
      await rows.nth(0).focus();
      await page.keyboard.press("ArrowDown");
      assert.equal(await rows.nth(1).evaluate((el) => el === document.activeElement), true, `${name}: ↓ 이동`);
      await page.keyboard.press("ArrowUp");
      assert.equal(await rows.nth(0).evaluate((el) => el === document.activeElement), true, `${name}: ↑ 이동`);
      await page.keyboard.press("Enter");
      assert.equal(await rows.nth(0).evaluate((el) => el.parentElement.open), true, `${name}: Enter로 펼침`);
      await page.keyboard.press("Enter");
    }
    console.log(`PASS: 홈 상태 띠(당직·통제·기한 필터)·주 단위 이동, 목록 ${pages.length}개 화면의 진한 버튼 1개, ↑/↓ 행 이동, Enter 펼치기`);
  } finally {
    if (app) await app.close().catch(() => {});
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
