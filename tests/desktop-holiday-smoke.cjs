// TASK-HOLIDAY-01: built-in law changes on the calendar, user holidays (type, paste, delete),
// and the out-of-table notice, in the real app.
// Build first: npm run build && node tests/desktop-holiday-smoke.cjs
const { _electron: electron } = require("playwright");
const { goTo } = require("./nav.cjs");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
// Button wording comes from the app (TASK-LABELS-01 U6).
const L = require("../shared/labels.mjs");

const root = path.resolve(__dirname, "..");
async function launch(dir, name, today) {
  const profile = path.join(dir, name);
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
  await page.clock.install({ time: new Date(`${today}T09:00:00+09:00`) });
  await page.locator("main h1").waitFor();
  return { app, page, file: path.join(profile, "workdesk.json") };
}
const openManager = async (page) => {
  await page.locator(".data-menu > summary").click();
  await page.getByRole("button", { name: "공휴일 관리", exact: true }).click();
  return page.getByRole("dialog", { name: "공휴일 관리" });
};

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "park-holiday-smoke-"));
  let app;
  try {
    let page, file;
    ({ app, page, file } = await launch(dir, "y2026", "2026-10-01"));
    const sheet = await openManager(page);
    // Typed entry.
    await sheet.getByLabel("날짜").fill("2026-10-02");
    await sheet.getByLabel("이름").fill("가상 임시공휴일");
    await sheet.getByRole("button", { name: L.addLabel(L.TARGET.holiday), exact: true }).click();
    await sheet.getByRole("status").filter({ hasText: "공휴일 1개를 등록했습니다." }).waitFor();
    assert.deepEqual(
      JSON.parse(fs.readFileSync(file, "utf8")).customHolidays.map((h) => [h.date, h.name]),
      [["2026-10-02", "가상 임시공휴일"]],
    );
    // A paste with one bad line registers nothing.
    await sheet.getByText("여러 날을 한 번에 붙여 넣기").click();
    const pasteBox = sheet.getByLabel("한 줄에 하나씩");
    await pasteBox.fill("2026-10-12,가상 휴무\n2026-13-01,잘못된 날");
    await sheet.getByRole("button", { name: "붙여 넣은 목록 등록", exact: true }).click();
    await sheet.getByText("2번째 줄: 'YYYY-MM-DD,이름' 형식이 아닙니다.").or(sheet.getByText("2번째 줄: 없는 날짜입니다 (2026-13-01).")).waitFor();
    assert.equal(JSON.parse(fs.readFileSync(file, "utf8")).customHolidays.length, 1, "틀린 줄이 있으면 하나도 등록하지 않음");
    // A valid paste skips dates already registered.
    await pasteBox.fill("2026-10-12\t가상 휴무\n2026-10-02,중복 날짜");
    await sheet.getByRole("button", { name: "붙여 넣은 목록 등록", exact: true }).click();
    await sheet.getByRole("status").filter({ hasText: "공휴일 1개를 등록했습니다. 이미 있는 날짜 1개는 건너뛰었습니다." }).waitFor();
    assert.equal(await sheet.locator(".holiday-list li").count(), 2);
    // Delete asks first and removes only that day.
    await sheet.getByRole("button", { name: "삭제 · 2026-10-12 가상 휴무", exact: true }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "삭제", exact: true }).click();
    await sheet.getByRole("status").filter({ hasText: "지웠습니다" }).waitFor();
    assert.deepEqual(JSON.parse(fs.readFileSync(file, "utf8")).customHolidays.map((h) => h.date), ["2026-10-02"]);
    await page.keyboard.press("Escape");
    await sheet.waitFor({ state: "hidden" });
    // The calendar shows the user holiday; 2026 has no out-of-table notice.
    await goTo(page, "월간 일정");
    const day = (date) => page.locator(`.calendar-day[data-date="${date}"]`);
    await day("2026-10-02").waitFor();
    assert.match(await day("2026-10-02").innerText(), /가상 임시공휴일/);
    assert.equal(await page.locator(".calendar-note").count(), 0);
    await app.close();
    app = undefined;

    // 2027: law changes on the calendar (노동절 Saturday → 5-03 대체공휴일). 2036: notice.
    ({ app, page } = await launch(dir, "y2027", "2027-05-01"));
    await goTo(page, "월간 일정");
    await day("2027-05-01").waitFor();
    assert.match(await day("2027-05-01").innerText(), /노동절/);
    assert.match(await day("2027-05-03").innerText(), /대체공휴일/);
    await app.close();
    app = undefined;
    ({ app, page } = await launch(dir, "y2036", "2036-02-01"));
    await goTo(page, "월간 일정");
    const note = page.locator(".calendar-note");
    await note.waitFor();
    assert.match(await note.textContent(), /^2036년은 음력 공휴일\(설·추석·부처님오신날\)이 표에 없습니다/);
    console.log("PASS: 노동절·대체공휴일 달력 표시, 공휴일 관리(직접 등록·붙여 넣기 전체 거부/중복 건너뛰기·삭제 확인)·달력 반영, 음력 표 범위 밖 안내");
  } finally {
    if (app) await app.close().catch(() => {});
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
