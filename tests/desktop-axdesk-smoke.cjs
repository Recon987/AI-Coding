// TASK-AXDESK-01: AX 사업 관리 in the real app — register/edit/delete, zone filter, search,
// budget display (예산 미등록·예산 초과), and the milestone derived once into the calendar,
// the home day list and the briefing text, never copied into events or tasks.
// Build first: npm run build && node tests/desktop-axdesk-smoke.cjs
const { _electron: electron } = require("playwright");
const { goTo, showModule } = require("./nav.cjs");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const L = require("../shared/labels.mjs");
const { MODULE_APPLETS } = require("../shared/applets.mjs");

const root = path.resolve(__dirname, "..");
const TODAY = "2026-10-19";
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
  await page.clock.install({ time: new Date(`${TODAY}T09:00:00+09:00`) });
  await page.locator("main h1").waitFor();
  // Reload so every screen computes "today" under the installed clock.
  await page.reload();
  await page.locator('.save-indicator[data-state="ready"]').waitFor();
  return { app, page };
}

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "park-axdesk-smoke-"));
  const profile = path.join(dir, "profile");
  const file = path.join(profile, "workdesk.json");
  const saved = () => JSON.parse(fs.readFileSync(file, "utf8"));
  let app;
  try {
    let page;
    ({ app, page } = await launch(dir, profile));
    const sheet = page.locator(".sheet[open]");
    const register = async (fields) => {
      await page.getByRole("button", { name: L.addLabel(L.TARGET.axProject), exact: true }).click();
      for (const [label, value] of Object.entries(fields)) {
        const control = sheet.getByLabel(label, { exact: true });
        if ((await control.evaluate((el) => el.tagName)) === "SELECT") await control.selectOption({ label: value });
        else await control.fill(value);
      }
    };
    const day = (date) => page.locator(`.calendar-day[data-date="${date}"]`);
    const axChips = () => page.locator(".calendar-chip.ax");

    // 1. Register: overspend is warned while typing but saved as entered.
    await goTo(page, "AX 사업 관리");
    await page.getByText("등록된 AX 사업이 없습니다.").waitFor();
    await register({
      사업명: "가상 혼잡도 분석",
      권역: "서부",
      단계: "수행/실증",
      "사업비(천원)": "1000",
      "집행액(천원)": "1130",
      "차기 마일스톤": "가상 중간보고",
      "마일스톤 날짜": "2026-10-21",
      담당자: "가상 담당",
    });
    await sheet.getByText("집행액이 사업비보다 130천원 많습니다.", { exact: false }).waitFor();
    assert.equal(await sheet.getByLabel("집행액(천원)", { exact: true }).getAttribute("aria-invalid"), null, "경고는 오류 표시가 아님");
    await page.keyboard.press("Control+Enter");
    await sheet.waitFor({ state: "hidden" });
    let data = saved();
    assert.equal(data.axProjects.length, 1);
    assert.deepEqual(
      [data.axProjects[0].zone, data.axProjects[0].stage, data.axProjects[0].budgetTotal, data.axProjects[0].budgetExecuted, data.axProjects[0].nextMilestoneDate],
      ["west", "execution", 1000, 1130, "2026-10-21"],
    );
    assert.deepEqual([data.events.length, data.tasks.length], [0, 0], "일정·업무에 복제하지 않음");
    const first = page.locator(".ax-record").filter({ hasText: "가상 혼잡도 분석" });
    assert.match(await first.locator(".record-preview").textContent(), /^집행 113% \(예산 초과\) · 가상 중간보고$/);
    await first.locator("summary").click();
    await first.getByText("예산 초과 130천원").waitFor();
    assert.match(await first.locator(".ax-budget").textContent(), /집행 1,130 \/ 사업비 1,000천원 · 집행률 113%/);
    assert.equal(await first.locator(".ax-bar > span").evaluate((el) => el.style.width), "100%", "막대만 100%로 제한");

    // 2. A project without budget or date: "예산 미등록", no calendar entry.
    await register({ 사업명: "가상 드론 실증", 권역: "본사" });
    await sheet.getByRole("button", { name: L.SAVE, exact: true }).click();
    await sheet.waitFor({ state: "hidden" });
    const second = page.locator(".ax-record").filter({ hasText: "가상 드론 실증" });
    assert.equal(await second.locator(".record-preview").textContent(), "예산 미등록");
    assert.equal(await page.locator(".ax-record").count(), 2);

    // 3. Zone filter (pressed state), search, reset.
    const zones = page.getByRole("group", { name: "권역" });
    await zones.getByRole("button", { name: "서부 1", exact: true }).click();
    assert.equal(await zones.getByRole("button", { name: "서부 1", exact: true }).getAttribute("aria-pressed"), "true");
    assert.deepEqual(await page.locator(".ax-record h3").allTextContents(), ["가상 혼잡도 분석"]);
    await zones.getByRole("button", { name: "전체 2", exact: true }).click();
    await page.getByLabel("사업 검색").fill("드론");
    assert.deepEqual(await page.locator(".ax-record h3").allTextContents(), ["가상 드론 실증"]);
    assert.match(await page.locator(".ax-summary").textContent(), /^1건 표시 · /);
    await page.getByLabel("사업 검색").fill("");

    // 4. Calendar: exactly one AX item, on the milestone day; it opens the project.
    await goTo(page, "월간 일정");
    await day("2026-10-21").waitFor();
    assert.equal(await axChips().count(), 1);
    assert.match(await day("2026-10-21").locator(".calendar-chip.ax").textContent(), /가상 혼잡도 분석 · 가상 중간보고/);
    await page.locator(".calendar-legend .tag.ax").waitFor();
    await day("2026-10-21").click();
    const agenda = page.getByRole("region", { name: "선택 날짜 기록", exact: true });
    assert.equal(await agenda.locator(".agenda-row .tag.ax").textContent(), "AX");
    assert.equal(await agenda.locator(".agenda-row time").textContent(), "종일");
    await agenda.getByRole("button", { name: "가상 혼잡도 분석 · 가상 중간보고", exact: true }).click();
    await page.getByRole("heading", { name: L.editLabel(L.TARGET.axProject), exact: true }).waitFor();

    // 5. Edit moves the milestone; still one item.
    await sheet.getByLabel("마일스톤 날짜", { exact: true }).fill("2026-10-28");
    await sheet.getByRole("button", { name: L.SAVE, exact: true }).click();
    await sheet.waitFor({ state: "hidden" });
    await goTo(page, "월간 일정");
    await day("2026-10-28").locator(".calendar-chip.ax").waitFor();
    assert.equal(await axChips().count(), 1);
    assert.equal(await day("2026-10-21").locator(".calendar-chip.ax").count(), 0);

    // 6. Home: the day list and the briefing text carry the milestone on its day only.
    await goTo(page, "업무 브리핑");
    await page.getByRole("button", { name: "다음 주", exact: true }).click();
    await page.getByRole("button", { name: /^수 28일,/ }).click();
    await page.locator(".timeline-row").filter({ hasText: "가상 혼잡도 분석 · 가상 중간보고" }).waitFor();
    assert.match(await page.locator(".day-counts").textContent(), /AX 1/);
    await page.getByRole("button", { name: "브리핑 미리보기", exact: true }).click();
    assert.match(await page.locator(".briefing-preview pre, pre").first().textContent(), /AX 사업 마일스톤 \(1\)\n- 가상 혼잡도 분석 \| 가상 중간보고 \| 서부 \| 수행\/실증/);

    // 7. Hiding the module keeps the milestone (menu only); the link still opens the project.
    await page.getByRole("navigation", { name: "주 메뉴" }).getByRole("button", { name: "모듈 관리", exact: true }).click();
    const drawer = page.getByRole("dialog", { name: "모듈 관리" });
    await drawer.getByRole("switch", { name: /^AX 사업 관리/ }).click();
    await drawer.getByRole("status").filter({ hasText: "숨겼습니다" }).waitFor();
    await page.keyboard.press("Escape");
    await drawer.waitFor({ state: "hidden" });
    await goTo(page, "월간 일정");
    await day("2026-10-28").locator(".calendar-chip.ax").waitFor();
    await day("2026-10-28").click();
    await agenda.getByRole("button", { name: "가상 혼잡도 분석 · 가상 중간보고", exact: true }).click();
    await page.locator(".hidden-module-note").waitFor();
    await sheet.getByRole("button", { name: "취소", exact: true }).click();
    await sheet.waitFor({ state: "hidden" });
    await showModule(page, MODULE_APPLETS.find((m) => m.id === "ax-desk"));

    // 8. Restart keeps everything; delete asks first and removes the calendar item too.
    await app.close();
    app = undefined;
    ({ app, page } = await launch(dir, profile));
    await goTo(page, "AX 사업 관리");
    assert.equal(await page.locator(".ax-record").count(), 2);
    await page.getByRole("button", { name: "삭제 · 가상 혼잡도 분석", exact: true }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "삭제", exact: true }).click();
    await page.locator(".ax-record").filter({ hasText: "가상 혼잡도 분석" }).waitFor({ state: "detached" });
    data = saved();
    assert.deepEqual(data.axProjects.map((p) => p.title), ["가상 드론 실증"]);
    await goTo(page, "월간 일정");
    await day("2026-10-28").waitFor();
    assert.equal(await axChips().count(), 0);
    assert.equal(await page.locator(".calendar-legend .tag.ax").count(), 0);
    console.log("PASS: AX 사업 등록·수정·삭제 확인·재실행, 권역 필터·검색, 예산 미등록·초과 집행(경고·막대 100% 제한·원값 저장), 마일스톤 달력 1개·이동·홈·브리핑 문구, 일정·업무 미복제, 모듈 숨김 후 유지·원본 열기");
  } finally {
    if (app) await app.close().catch(() => {});
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
