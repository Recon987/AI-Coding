// TASK-MODULES-02: core/module menu, page switch, 모듈 관리 drawer (show/hide, order, keyboard),
// hidden-module records still reachable, order kept after restart, read-only files untouched.
// Build first: npm run build && node tests/desktop-modules-smoke.cjs
const { _electron: electron } = require("playwright");
const { goTo, menuButton } = require("./nav.cjs");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const store = require("../desktop/store.cjs");
const { READER_VERSION } = require("../shared/model.mjs");

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
  return { app, page };
}
const sample = () => {
  const data = store.empty();
  data.patrols.push({
    id: "p1", title: "가상 숨김 순찰", at: `${TODAY}T08:00:00+09:00`, route: "가상 구간", observer: "가상 직원",
    findings: "가상 확인", action: "", risk: "normal",
  });
  data.controls.push({ id: "c1", title: "가상 통제 구간", zone: null, reason: "weather", start: TODAY, end: null, note: "" });
  return data;
};
const menu = (page) => page.getByRole("navigation", { name: "주 메뉴" });
const moduleNames = (page) => menu(page).locator(".nav-section:not(.nav-footer)").filter({ has: page.locator("p", { hasText: /^모듈$/ }) }).getByRole("button").evaluateAll(
  (buttons) => buttons.map((b) => b.getAttribute("aria-label")),
);
const openDrawer = async (page) => {
  await menu(page).getByRole("button", { name: "모듈 관리", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "모듈 관리" });
  await drawer.waitFor();
  return drawer;
};
const toggle = (drawer, name) => drawer.getByRole("switch", { name: new RegExp(`^${name}`) });
const closeDrawer = async (page, drawer) => {
  await page.keyboard.press("Escape");
  await drawer.waitFor({ state: "hidden" });
};

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "park-modules-smoke-"));
  let app;
  try {
    const profile = path.join(dir, "main");
    fs.mkdirSync(profile, { recursive: true });
    const file = path.join(profile, "workdesk.json");
    store.write(file, sample());
    let page;
    ({ app, page } = await launch(dir, profile));
    const saved = () => JSON.parse(fs.readFileSync(file, "utf8"));
    const before = fs.readFileSync(file, "utf8");

    // 1. Default menu: core four, then patrols and AX (office hidden without office records).
    const core = await menu(page).locator(".nav-section").first().getByRole("button").evaluateAll(
      (buttons) => buttons.map((b) => b.getAttribute("aria-label")),
    );
    assert.deepEqual(core, ["업무 브리핑", "월간 일정", "인수인계·제출 기한", "업무·전화 메모"]);
    assert.deepEqual(await moduleNames(page), ["현장 순찰", "AX 사업 관리"]);
    assert.equal(Object.hasOwn(saved(), "modules"), false, "열기만 해서는 설정을 쓰지 않음");

    // 2. Page switch inside an applet, by keyboard; the menu entry stays current.
    await goTo(page, "인수인계");
    const switcher = page.getByRole("navigation", { name: "인수인계·제출 기한 보기" });
    await switcher.getByRole("button", { name: "제출 기한", exact: true }).focus();
    await page.keyboard.press("Enter");
    await page.getByRole("heading", { level: 1, name: "제출 기한", exact: true }).waitFor();
    assert.equal(await switcher.getByRole("button", { name: "제출 기한", exact: true }).getAttribute("aria-current"), "page");
    assert.equal(await menuButton(page, "인수인계").getAttribute("aria-current"), "page");
    // The applet entry keeps the current page instead of jumping back.
    await menuButton(page, "인수인계").click();
    await page.getByRole("heading", { level: 1, name: "제출 기한", exact: true }).waitFor();
    // TASK-NAV-02: coming back from another tool opens the page last used there, in one click.
    await goTo(page, "업무 브리핑");
    await menuButton(page, "인수인계").click();
    await page.getByRole("heading", { level: 1, name: "제출 기한", exact: true }).waitFor();
    await goTo(page, "전화메모");
    await goTo(page, "월간 일정");
    await menuButton(page, "업무 메모").click();
    await page.getByRole("heading", { level: 1, name: "전화메모", exact: true }).waitFor();
    // Remembering is a view setting: workdesk.json is not written.
    assert.equal(Object.hasOwn(saved(), "modules"), false);
    assert.equal(fs.readFileSync(file, "utf8"), before, "화면 이동만으로 자료 파일을 쓰지 않음");

    // 3. Hide patrols from the drawer (keyboard): menu entry gone, records kept.
    await goTo(page, "탐방로 통제");
    let drawer = await openDrawer(page);
    assert.equal(await drawer.getByText("항상 표시", { exact: true }).count(), 4, "코어 4종은 끌 수 없음 표시");
    await toggle(drawer, "현장 순찰").focus();
    await page.keyboard.press("Space");
    await drawer.getByRole("status").filter({ hasText: "현장 순찰을(를) 메뉴에서 숨겼습니다." }).waitFor();
    assert.equal(await toggle(drawer, "현장 순찰").isChecked(), false);
    await closeDrawer(page, drawer);
    assert.deepEqual(await moduleNames(page), ["AX 사업 관리"]);
    // The page in use stays open with a note, so nothing on it is lost.
    await page.getByRole("heading", { level: 1, name: "탐방로 통제", exact: true }).waitFor();
    const note = page.locator(".hidden-module-note");
    assert.match(await note.textContent(), /^현장 순찰 모듈은 메뉴에서 숨겨져 있습니다/);
    let after = saved();
    assert.deepEqual(after.modules.enabledModuleIds, ["ax-desk"]);
    assert.equal(after.patrols[0].title, "가상 숨김 순찰");
    assert.equal(after.controls[0].title, "가상 통제 구간");
    // Hidden records still reach the briefing and the global search.
    await goTo(page, "업무 브리핑");
    assert.equal(await note.count(), 0);
    assert.match(await page.locator(".content").innerText(), /가상 통제 구간/);
    await page.keyboard.press("Control+k");
    await page.getByLabel("기록 통합 검색", { exact: true }).fill("가상 숨김 순찰");
    await page.locator(".search-result").first().click();
    await page.getByRole("heading", { level: 1, name: "현장 순찰", exact: true }).waitFor();
    if (await page.locator(".sheet[open]").count())
      await page.locator(".sheet[open]").getByRole("button", { name: "취소", exact: true }).click();
    await note.waitFor();
    await note.getByRole("button", { name: "모듈 관리 열기", exact: true }).click();
    drawer = page.getByRole("dialog", { name: "모듈 관리" });
    await toggle(drawer, "현장 순찰").click();
    await drawer.getByRole("status").filter({ hasText: "보이게 했습니다" }).waitFor();
    await closeDrawer(page, drawer);
    await note.waitFor({ state: "detached" });
    assert.deepEqual(await moduleNames(page), ["현장 순찰", "AX 사업 관리"], "켜면 원래 자리로");

    // 4. Reorder with the keyboard; the order survives a restart.
    drawer = await openDrawer(page);
    // The drawer lists hidden modules too (사무소 현황 sits between), so it takes two moves;
    // focus stays on the button between presses.
    const drawerOrder = () => drawer.locator(".applet-list").nth(1).locator(".applet-name").allTextContents();
    assert.deepEqual(await drawerOrder(), ["현장 순찰", "사무소 현황", "AX 사업 관리"]);
    await drawer.getByRole("button", { name: "위로 · AX 사업 관리", exact: true }).focus();
    const up = drawer.getByRole("button", { name: "위로 · AX 사업 관리", exact: true });
    for (const expected of [["현장 순찰", "AX 사업 관리", "사무소 현황"], ["AX 사업 관리", "현장 순찰", "사무소 현황"]]) {
      await page.keyboard.press("Enter");
      await page.waitForFunction((want) => [...document.querySelectorAll(".applet-drawer .applet-list:last-of-type .applet-name")]
        .map((el) => el.textContent).join() === want, expected.join());
    }
    await drawer.getByRole("status").filter({ hasText: "AX 사업 관리을(를) 위로 옮겼습니다." }).waitFor();
    // At the top the button is marked unavailable but keeps keyboard focus.
    assert.equal(await up.getAttribute("aria-disabled"), "true");
    assert.equal(await up.evaluate((el) => el === document.activeElement), true, "맨 위에서도 포커스 유지");
    await page.keyboard.press("Enter");
    assert.deepEqual(await drawerOrder(), ["AX 사업 관리", "현장 순찰", "사무소 현황"]);
    await closeDrawer(page, drawer);
    assert.deepEqual(await moduleNames(page), ["AX 사업 관리", "현장 순찰"]);
    await app.close();
    app = undefined;
    ({ app, page } = await launch(dir, profile));
    assert.deepEqual(await moduleNames(page), ["AX 사업 관리", "현장 순찰"]);
    // The remembered pages survive the restart too; a broken stored value falls back to the first page.
    await menuButton(page, "인수인계").click();
    await page.getByRole("heading", { level: 1, name: "제출 기한", exact: true }).waitFor();
    await page.evaluate(() => localStorage.setItem("park-workdesk-last-page", "{깨진 값"));
    await page.reload();
    await page.locator('.save-indicator[data-state="ready"]').waitFor();
    await menuButton(page, "인수인계").click();
    await page.getByRole("heading", { level: 1, name: "인수인계", exact: true }).waitFor();

    // 5. Every module off: the core four still work and the module section disappears.
    drawer = await openDrawer(page);
    for (const name of ["AX 사업 관리", "현장 순찰"]) {
      await toggle(drawer, name).click();
      await drawer.getByRole("status").filter({ hasText: `${name}을(를) 메뉴에서 숨겼습니다.` }).waitFor();
    }
    await closeDrawer(page, drawer);
    assert.deepEqual(await moduleNames(page), []);
    for (const label of ["월간 일정", "전화메모", "제출 기한", "업무 브리핑"]) await goTo(page, label);
    after = saved();
    assert.deepEqual(after.modules.enabledModuleIds, []);
    assert.equal(after.patrols.length, 1);

    // 6. 960px at 125%: menu and page switch fit without sideways scrolling.
    await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      win.setContentSize(960, 680);
      win.webContents.setZoomFactor(1.25);
    });
    await page.waitForFunction(() => Math.abs(innerWidth - 768) <= 1);
    await goTo(page, "업무 메모");
    const fit = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - innerWidth,
      switchRight: document.querySelector(".page-switch").getBoundingClientRect().right,
      width: innerWidth,
    }));
    assert.ok(fit.overflow <= 1 && fit.switchRight <= fit.width, JSON.stringify(fit));
    await app.close();
    app = undefined;

    // 7. A newer app's file: switches are disabled and nothing is written.
    const newerProfile = path.join(dir, "newer");
    fs.mkdirSync(newerProfile, { recursive: true });
    const newerFile = path.join(newerProfile, "workdesk.json");
    const raw = JSON.stringify({ ...sample(), minReader: READER_VERSION + 1 }, null, 2);
    fs.writeFileSync(newerFile, raw);
    ({ app, page } = await launch(dir, newerProfile));
    await page.locator('.save-indicator[data-state="read-only"]').waitFor();
    drawer = await openDrawer(page);
    await drawer.getByRole("note").filter({ hasText: "읽기 전용 자료라 모듈 설정을 바꿀 수 없습니다." }).waitFor();
    assert.equal(await toggle(drawer, "현장 순찰").isDisabled(), true);
    assert.equal(await drawer.getByRole("button", { name: "아래로 · 현장 순찰", exact: true }).isDisabled(), true);
    await closeDrawer(page, drawer);
    assert.equal(fs.readFileSync(newerFile, "utf8"), raw);
    console.log("PASS: 코어 4종·기본 모듈, 화면 안 전환(키보드), 모듈 숨김/복구(자료·브리핑·검색 유지, 숨긴 화면 안내), 순서 변경·재실행 유지, 모두 꺼도 코어 사용, 960px·125%, 읽기 전용 잠금, 도구별 마지막 화면 기억(재실행 유지·깨진 값 무시·자료 무저장)");
  } finally {
    if (app) await app.close().catch(() => {});
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
