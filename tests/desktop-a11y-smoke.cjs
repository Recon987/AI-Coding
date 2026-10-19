// TASK-A11Y-02: contrast, forced colours, status announcements, date names, shortcuts and
// narrow-width wrapping in the real Electron app.
// Build first: npm run build && node tests/desktop-a11y-smoke.cjs
const { _electron: electron } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { REVIEW_DATE, reviewFixture } = require("./review-fixture.cjs");

const root = path.resolve(__dirname, "..");
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "park-a11y-smoke-"));
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
    await page.evaluate((value) => window.workdesk.save(value), reviewFixture(REVIEW_DATE));
    await page.reload();
    await page.locator('.save-indicator[data-state="ready"]').waitFor();
    const nav = (name) => page.locator("nav").getByRole("button", { name, exact: true }).click();

    // A4: field edges reach 3:1 (#7f8f88) and forced colours keep the selected state visible.
    await nav("현장 순찰");
    const search = page.getByLabel("순찰 검색");
    assert.equal(await search.evaluate((el) => getComputedStyle(el).borderTopColor), "rgb(127, 143, 136)");
    await page.emulateMedia({ forcedColors: "active" });
    await nav("월간 일정");
    const selectedTab = page.getByRole("tab", { name: "월간", exact: true });
    assert.equal(await selectedTab.evaluate((el) => getComputedStyle(el).outlineStyle), "solid", "고대비 모드 선택 탭 테두리");
    await page.emulateMedia({ forcedColors: "none" });

    // A1 remainder: date names start with what the button shows.
    const monthCell = page.locator('.calendar-day[data-date="2026-10-15"]');
    assert.match(await monthCell.getAttribute("aria-label"), /^15일, 2026\. 10\. 15\. \(목\), \d+건/);
    await nav("업무 브리핑");
    assert.match(await page.getByRole("group", { name: "오늘 상태" }).getAttribute("aria-label"), /오늘 상태/);
    const weekButton = page.locator(".week-strip button.selected");
    assert.match(await weekButton.getAttribute("aria-label"), /^목 15일, 2026\. 10\. 15\. 기록 \d+건$/);

    // A5: the status region exists before any message; the toast stays 8 s and can be closed.
    const live = page.locator('.sr-only[role="status"]');
    // Record every change of the announcement region with the app's clock, for diagnosis.
    await page.evaluate(() => {
      const region = document.querySelector('.sr-only[role="status"]');
      window.__liveLog = [];
      new MutationObserver(() =>
        window.__liveLog.push([Date.now(), region.innerHTML]),
      ).observe(region, { childList: true, subtree: true, characterData: true });
    });
    assert.equal(await live.count(), 1);
    assert.equal((await live.textContent()).trim(), "");
    await nav("업무 메모");
    await page.getByRole("button", { name: "메모 추가", exact: true }).click();
    await page.getByLabel("제목", { exact: true }).fill("가상 낭독 확인 메모");
    await page.keyboard.press("Control+Enter");
    await page.locator(".sheet[open]").waitFor({ state: "hidden" });
    await page.waitForFunction(() => document.querySelector('.sr-only[role="status"]')?.textContent.includes("저장했습니다"));
    const toast = page.locator(".save-feedback");
    // From here only runFor moves the app's timers, so slow runners cannot change the result.
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10);
    const sequence = () => page.locator('.sr-only[role="status"] [data-sequence]').getAttribute("data-sequence");
    const first = await sequence();
    // page.clock keeps running in real time after runFor, so leave a margin for slow
    // Windows runners: 5 s, then 4 s after the second save (9 s after the first).
    await page.clock.runFor(5000);
    assert.equal(await toast.isVisible(), true, "5초 뒤에도 알림 표시");
    // Same message again: announced anew and the 8 s timer restarts (Codex review finding).
    await page.getByRole("button", { name: "메모 추가", exact: true }).click();
    await page.getByLabel("제목", { exact: true }).fill("가상 낭독 확인 메모 2");
    await page.keyboard.press("Control+Enter");
    await page.locator(".sheet[open]").waitFor({ state: "hidden" });
    // Wait for the *next* announcement itself (a cleared region must not count).
    const next = String(Number(first) + 1);
    await page
      .waitForFunction((n) => document.querySelector(`.sr-only[role="status"] [data-sequence="${n}"]`), next)
      .catch(async (error) => {
        console.error("다음 안내 없음:", await page.evaluate(() => window.__liveLog));
        throw error;
      });
    await page.clock.runFor(4000);
    if (!(await toast.isVisible())) {
      // Diagnose on the runner that fails: what does the app hold right now?
      console.error("알림 진단:", await page.evaluate(() => ({
        live: document.querySelector('.sr-only[role="status"]')?.innerHTML,
        toast: document.querySelector(".save-feedback")?.outerHTML ?? null,
        active: document.activeElement?.outerHTML.slice(0, 120),
        now: Date.now(),
        log: window.__liveLog,
      })));
      assert.fail("같은 문구 재저장 후 타이머 다시 시작(첫 저장 후 9초 이상)");
    }
    // The close button is reachable by keyboard, not hidden from screen readers,
    // and returns focus to where the user was.
    const close = toast.getByRole("button", { name: "알림 닫기", exact: true });
    assert.equal(await close.evaluate((el) => el.closest('[aria-hidden="true"]') === null && el.tabIndex >= 0), true);
    const memoSearch = page.getByLabel("기록 검색");
    await memoSearch.focus();
    await close.focus();
    await page.clock.runFor(9000);
    assert.equal(await toast.isVisible(), true, "닫기 버튼에 포커스가 있는 동안 유지");
    // 바깥으로 나갔다 재진입하면 가장 최근의 작업 위치로 복귀해야 한다.
    const latestTarget = page.locator(".data-menu > summary");
    await latestTarget.focus();
    await page.keyboard.press("Tab");
    assert.equal(await close.evaluate((el) => el === document.activeElement), true, "Tab으로 알림 재진입");
    await page.keyboard.press("Enter");
    await toast.waitFor({ state: "hidden" });
    assert.equal(await latestTarget.evaluate((el) => el === document.activeElement), true, "재진입 후 가장 최근 위치로 포커스 복귀");
    // List search announces how many rows remain.
    await page.getByLabel("기록 검색").fill("낭독 확인");
    assert.equal(await page.locator('.list-count[role="status"]').textContent(), "2건 표시");

    // A8: a bare "/" no longer opens search; Ctrl+K still does.
    await page.locator("main h1").click();
    await page.keyboard.press("/");
    assert.equal(await page.locator(".search-dialog[open]").count(), 0, "/ 키로 열리지 않음");
    await page.keyboard.press("Control+k");
    await page.locator(".search-dialog[open]").waitFor();
    await page.keyboard.type("가상");
    assert.match(await page.locator('.search-count[role="status"]').textContent(), /^검색 결과 \d+건$/);
    await page.keyboard.press("Escape");

    // A6: at 1100 px calendar chips and the duty tile may wrap to two lines.
    await page.setViewportSize({ width: 1100, height: 760 });
    await nav("월간 일정");
    const chip = page.locator(".calendar-chip > span").first();
    assert.equal(await chip.evaluate((el) => getComputedStyle(el).webkitLineClamp), "2");
    await page.setViewportSize({ width: 1360, height: 900 });
    assert.equal(await chip.evaluate((el) => getComputedStyle(el).webkitLineClamp), "none", "넓은 화면은 한 줄");
    console.log("PASS: 입력칸 대비·고대비 선택 표시, 날짜 이름(보이는 글자 먼저), 상시 낭독 영역·같은 문구 재안내·알림 8초(포커스 중 유지)·키보드 닫기와 포커스 복귀, 검색 건수 낭독, / 단축키 제거·Ctrl+K 유지, 좁은 폭 2줄");
  } finally {
    if (app) await app.close().catch(() => {});
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
