// TASK-MODULES-02: menu navigation for desktop tests. The sidebar now lists applets (기본·모듈),
// and an applet with several pages (e.g. 인수인계·제출 기한) switches pages from the
// "<applet> 보기" bar under the heading. Tests keep naming the page they want by its heading.
const { CORE_APPLETS, MODULE_APPLETS } = require("../shared/applets.mjs");

const PAGE_IDS = {
  "업무 브리핑": "briefing",
  "월간 일정": "calendar",
  "현장 순찰": "patrol",
  "탐방로 통제": "controls",
  인수인계: "handover",
  "제출 기한": "submission",
  "사무소 현황": "office",
  전화메모: "calls",
  "업무 메모": "notes",
  "AX 사업 관리": "ax",
  "GIS·AI 스니펫": "ax-snippets",
  바로가기: "folders",
  "앱 안내": "about",
};
const APPLETS = [...CORE_APPLETS, ...MODULE_APPLETS];
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function target(label) {
  const id = PAGE_IDS[label];
  if (!id) throw new Error(`알 수 없는 화면: ${label}`);
  return { id, applet: APPLETS.find((a) => a.pages.includes(id)) };
}

/** The sidebar button that leads to `label` (applet entry, or 바로가기·앱 안내). */
function menuButton(page, label) {
  const { applet } = target(label);
  return page
    .getByRole("navigation", { name: "주 메뉴" })
    .getByRole("button", { name: applet ? applet.name : label, exact: true });
}

/** Turns a hidden module back on from 모듈 관리 (e.g. 사무소 현황 is off on new installs). */
async function showModule(page, applet) {
  await page.getByRole("navigation", { name: "주 메뉴" }).getByRole("button", { name: "모듈 관리", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "모듈 관리" });
  // The switch follows the saved setting, so it flips once the save finishes.
  const toggle = drawer.getByRole("switch", { name: new RegExp(`^${escape(applet.name)}`) });
  await toggle.click();
  await drawer.getByRole("status").filter({ hasText: "보이게 했습니다" }).waitFor();
  if (!(await toggle.isChecked())) throw new Error(`${applet.name} 모듈을 켜지 못했습니다.`);
  await page.keyboard.press("Escape");
  await drawer.waitFor({ state: "hidden" });
}

/**
 * Opens the page whose heading is `label`. `click` lets click-counting tests (task-flows)
 * count each real click. Returns the number of clicks it took.
 */
async function goTo(page, label, { click = (locator) => locator.click() } = {}) {
  const { applet } = target(label);
  const button = menuButton(page, label);
  if (applet && MODULE_APPLETS.includes(applet) && !(await button.count())) await showModule(page, applet);
  await click(button);
  let clicks = 1;
  const heading = page.getByRole("heading", { level: 1, name: label, exact: true });
  if (applet && applet.pages.length > 1) {
    const sw = page.getByRole("navigation", { name: `${applet.name} 보기` }).getByRole("button", { name: label, exact: true });
    await sw.waitFor();
    if ((await sw.getAttribute("aria-current")) !== "page") {
      await click(sw);
      clicks++;
    }
  }
  await heading.waitFor();
  return clicks;
}

module.exports = { goTo, menuButton, showModule, PAGE_IDS };
