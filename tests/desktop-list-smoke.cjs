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
      { id: "future-control", title: "가상 예정 통제", zone: null, reason: "weather", start: "2030-11-01", end: null, note: "" },
    ];
    await page.evaluate((value) => window.workdesk.save(value), data);
    await page.reload();
    await page.locator('.save-indicator[data-state="ready"]').waitFor();
    // TASK-HOME-02: status strip shows today's duty staff; tiles filter or navigate; week-only date moves.
    const strip = page.getByLabel("오늘 상태");
    assert.match(await strip.getByRole("button", { name: /^오늘 당직/ }).getAttribute("aria-label"), /^오늘 당직 (주간당직|숙직) 가상직원/);
    assert.match(await strip.getByRole("button", { name: /^오늘 통제/ }).getAttribute("aria-label"), /^오늘 통제 2곳: 가상 계곡 탐방로, 가상 능선 탐방로$/);
    // TASK-POLISH-01: the strip tile may truncate; the office card lists every name in full.
    const dutyLine = await page.getByLabel("오늘의 사무소 근무").locator(".office-duty-names").textContent();
    assert.match(dutyLine, /^오늘 당직: (주간당직|숙직) 가상직원/);
    assert.equal(await page.locator(".office-duty-names").evaluate((el) => el.scrollWidth <= el.clientWidth), true, "이름 줄 잘림 없음");
    await strip.getByRole("button", { name: /^기한 경과/ }).click();
    await page.locator(".segmented button.selected", { hasText: "기한 경과" }).waitFor();
    assert.equal(await page.getByLabel("브리핑 날짜").count(), 0, "날짜 입력칸 없음(주간 띠만)");
    await page.getByRole("button", { name: "다음 주", exact: true }).click();
    await page.getByRole("heading", { name: /^10\. 22\. \(목\) 기록$/ }).waitFor();
    await page.getByRole("button", { name: "오늘", exact: true }).click();
    await page.getByRole("heading", { name: "오늘의 일정과 기록" }).waitFor();
    // TASK-CALENDAR-03: week and list views with week moves and source navigation.
    await page.locator("nav").getByRole("button", { name: "월간 일정", exact: true }).click();
    await page.getByRole("tab", { name: "주간" }).click();
    await page.getByRole("heading", { name: "10. 12. ~ 10. 18. 주간" }).waitFor();
    assert.equal(await page.locator(".week-column").count(), 7);
    assert.ok((await page.locator(".week-item").count()) > 0, "주간 기록");
    await page.getByRole("button", { name: "다음 주", exact: true }).click();
    await page.getByRole("heading", { name: "10. 19. ~ 10. 25. 주간" }).waitFor();
    await page.getByRole("button", { name: "이전 주", exact: true }).click();
    await page.getByRole("tab", { name: "목록" }).click();
    await page.getByRole("heading", { name: "10. 15.부터 30일" }).waitFor();
    // A modal inside the hidden month-only detail area used to open at 0x0 and block the app.
    for (const view of ["주간", "목록"]) {
      await page.getByRole("tab", { name: view, exact: true }).click();
      await page.getByRole("button", { name: "일정 추가", exact: true }).click();
      const editor = page.getByRole("dialog", { name: "일정 등록", exact: true });
      await editor.waitFor({ state: "visible" });
      assert.equal(await editor.evaluate(el => !!el.closest("[hidden]")), false);
      await editor.getByLabel("일정 제목", { exact: true }).fill(`${view} 보기에서 등록`);
      await editor.getByLabel("일정 일시", { exact: true }).fill(`${REVIEW_DATE}T13:00`);
      await editor.getByRole("button", { name: "일정 저장", exact: true }).click();
      await editor.waitFor({ state: "hidden" });
      assert.ok((await page.evaluate(() => window.workdesk.load())).events.some(e => e.title === `${view} 보기에서 등록`));
      assert.equal(await page.getByRole("tab", { name: view, exact: true }).getAttribute("aria-selected"), "true");
    }
    // TASK-POLISH-01: view tabs are one Tab stop; arrows/Home/End select and focus.
    const tab = (name) => page.getByRole("tab", { name, exact: true });
    // Focus moves on the next animation frame after the tab re-renders; wait for it.
    const focused = (name) =>
      page
        .waitForFunction((label) => document.activeElement?.getAttribute("role") === "tab" && document.activeElement.textContent === label, name, { timeout: 3000 })
        .then(() => true, () => false);
    assert.deepEqual(await page.locator(".calendar-views [role=tab]").evaluateAll((els) => els.map((el) => el.tabIndex)), [-1, -1, 0]);
    await tab("목록").focus();
    await page.keyboard.press("Home");
    await page.locator("#calendar-panel-month[role=tabpanel]").waitFor();
    assert.equal(await focused("월간"), true);
    await page.keyboard.press("ArrowLeft");
    assert.equal(await tab("목록").getAttribute("aria-selected"), "true");
    assert.equal(await focused("목록"), true);
    await page.keyboard.press("ArrowLeft");
    assert.equal(await tab("주간").getAttribute("aria-controls"), "calendar-panel-week");
    assert.equal(await page.locator("#calendar-panel-week").getAttribute("aria-labelledby"), "calendar-tab-week");
    // Week-view closures open their source record instead of being a dead label.
    await page.getByRole("button", { name: "탐방로 통제 가상 계곡 탐방로 원본 열기" }).first().click();
    await page.getByRole("heading", { name: "탐방로 통제", level: 1 }).waitFor();
    const controlEditor = page.getByRole("dialog", { name: "통제 수정", exact: true });
    assert.equal(await controlEditor.getByLabel("통제 구간·대상").inputValue(), "가상 계곡 탐방로");
    await page.keyboard.press("Escape");
    await controlEditor.waitFor({ state: "hidden" });
    await page.locator("nav").getByRole("button", { name: "월간 일정", exact: true }).click();
    await tab("목록").click();
    const patrolRow = page.locator(".list-view-row").filter({ hasText: "순찰" }).first();
    await patrolRow.click();
    await page.getByRole("heading", { name: "현장 순찰", level: 1 }).waitFor();
    // Like the home timeline, opening a record shows its editor; close it unchanged.
    await page.locator(".sheet[open]").waitFor();
    await page.keyboard.press("Escape");
    await page.locator(".sheet[open]").waitFor({ state: "hidden" });
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
    // Future closures cannot be 'lifted today' into a still-active future one-day record.
    await page.locator("nav").getByRole("button", { name: "탐방로 통제", exact: true }).click();
    await page.getByRole("tab", { name: /^예정/ }).click();
    const future = page.locator(".control-record").filter({ hasText: "가상 예정 통제" });
    assert.equal(await future.getByRole("button", { name: /^오늘 해제 · / }).count(), 0);
    assert.equal(await future.getByRole("button", { name: /^삭제 · / }).count(), 1);
    await page.getByRole("tab", { name: /^진행 중/ }).click();
    const active = page.locator(".control-record").filter({ hasText: "가상 계곡 탐방로" });
    await active.getByRole("button", { name: /^오늘 해제 · / }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "오늘 해제", exact: true }).click();
    await page.waitForFunction(() => window.workdesk.load().then(d => d.controls.find(c => c.id === "c1").end !== null));
    const savedControls = (await page.evaluate(() => window.workdesk.load())).controls;
    assert.equal(savedControls.find(c => c.id === "c1").end, REVIEW_DATE);
    assert.equal(savedControls.find(c => c.id === "future-control").end, null);

    // The primary save may commit while the auxiliary last-good write fails.
    const liveFile = await app.evaluate(({ app }) => app.getPath("userData") + "/workdesk.json");
    const previousGood = fs.readFileSync(liveFile + ".last-good", "utf8");
    fs.mkdirSync(liveFile + ".last-good.tmp");
    await page.locator("nav").getByRole("button", { name: "업무 메모", exact: true }).click();
    await page.getByRole("button", { name: "메모 추가", exact: true }).click();
    await page.getByLabel("제목", { exact: true }).fill("보호본 실패에도 저장된 메모");
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await page.locator(".sheet[open]").waitFor({ state: "hidden" });
    await page.getByRole("alert").filter({ hasText: "자료는 저장했지만" }).waitFor();
    assert.ok((await page.evaluate(() => window.workdesk.load())).notes.some(n => n.title === "보호본 실패에도 저장된 메모"));
    await page.getByRole("heading", { name: "보호본 실패에도 저장된 메모", exact: true }).waitFor();
    assert.equal(fs.readFileSync(liveFile + ".last-good", "utf8"), previousGood);
    fs.rmdirSync(liveFile + ".last-good.tmp");
    // A subsequent healthy save keeps that committed record and clears the warning.
    await page.getByRole("button", { name: "메모 추가", exact: true }).click();
    await page.getByLabel("제목", { exact: true }).fill("보호본 재시도 후 메모");
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await page.locator(".sheet[open]").waitFor({ state: "hidden" });
    await page.getByRole("alert").waitFor({ state: "hidden" });
    assert.ok(JSON.parse(fs.readFileSync(liveFile + ".last-good", "utf8")).notes.some(n => n.title === "보호본 실패에도 저장된 메모"));
    // TASK-PANEL-01 D2: copy a patrol as a new one; the hint names the real source and fields.
    const source = (await page.evaluate(() => window.workdesk.load())).patrols[0];
    await page.locator("nav").getByRole("button", { name: "현장 순찰", exact: true }).click();
    // The fixture repeats titles, so the clicked row is identified by the copied values.
    await page.getByRole("button", { name: `이 기록으로 새 순찰 · ${source.title}`, exact: true }).first().click();
    const route = await page.getByLabel("순찰 구간").inputValue();
    const observer = await page.getByLabel("기록자", { exact: true }).inputValue();
    assert.ok(route && observer);
    const hint = await page.locator(".editor-hint").textContent();
    assert.ok(hint.startsWith(`‘${source.title}’에서 가져옴: 순찰 구간 ${route} · 기록자 ${observer}`), hint);
    assert.equal(await page.getByLabel("순찰 구간").getAttribute("aria-describedby"), await page.locator(".editor-hint").getAttribute("id"));
    await page.getByLabel("확인 사항").fill("복사 순찰 이상 없음");
    await page.getByRole("button", { name: "순찰 저장", exact: true }).click();
    await page.locator(".sheet[open]").waitFor({ state: "hidden" });
    const copied = (await page.evaluate(() => window.workdesk.load())).patrols.at(-1);
    assert.equal(copied.findings, "복사 순찰 이상 없음");
    assert.equal(copied.route, route);
    assert.ok(!(await page.evaluate(() => window.workdesk.load())).patrols.slice(0, -1).some((p) => p.id === copied.id));
    assert.match(copied.title, /^(순찰|[^ ]+)( \S+구역)? \d{2}:\d{2}$/, "빈 제목은 자동 생성");
    assert.equal(copied.observations, undefined);
    assert.equal(copied.coordinates, undefined);
    // The plain "add" button now defaults from that last-added record (not the copy's source title).
    await page.getByRole("button", { name: "순찰 기록 추가", exact: true }).click();
    assert.match(await page.locator(".editor-hint").textContent(), new RegExp(`^‘${copied.title}’에서 가져옴: 기록자 ${observer}`));
    await page.keyboard.press("Escape");
    await page.locator(".sheet[open]").waitFor({ state: "hidden" });

    // TASK-EDITOR-02 A2: a keyboard toggle keeps focus on the same button through the save.
    await page.locator("nav").getByRole("button", { name: "전화메모", exact: true }).click();
    const firstToggle = page.locator(".row-list .record-actions button").first();
    const toggleLabel = (await firstToggle.textContent()).split(" · ")[0];
    await firstToggle.focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction((before) => {
      const el = document.activeElement;
      return el?.closest(".record-actions") && !el.textContent.startsWith(before);
    }, toggleLabel);
    await page.keyboard.press("Enter");
    await page.waitForFunction((before) => document.activeElement?.textContent.startsWith(before), toggleLabel);
    // A3: an invalid end date is shown under its field, linked, and focused on save.
    await page.locator("nav").getByRole("button", { name: "탐방로 통제", exact: true }).click();
    await page.getByRole("button", { name: "통제 등록", exact: true }).click();
    const controlSheet = page.locator(".sheet[open]");
    assert.match(await controlSheet.locator(".field", { hasText: "통제 구간·대상" }).locator(".required-mark").textContent(), /필수/);
    await page.getByLabel("통제 구간·대상").fill("가상 오류 확인 구간");
    await page.getByLabel("시작일").fill("2030-11-05");
    await page.getByLabel("종료일").fill("2030-11-01");
    const endInput = page.getByLabel("종료일");
    assert.equal(await endInput.getAttribute("aria-invalid"), "true");
    const errorText = await page.evaluate(() => {
      const input = document.activeElement?.closest(".sheet")?.querySelector('[aria-invalid="true"]');
      return (input?.getAttribute("aria-describedby") ?? "").split(" ").map((id) => document.getElementById(id)?.textContent).join(" | ");
    });
    assert.match(errorText, /종료일은 시작일과 같거나 이후/);
    await page.getByRole("button", { name: "통제 저장", exact: true }).click();
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-invalid") === "true");
    assert.ok(!(await page.evaluate(() => window.workdesk.load())).controls.some((c) => c.title === "가상 오류 확인 구간"));
    await page.keyboard.press("Escape");
    await page.getByRole("alertdialog").getByRole("button", { name: "변경 버리기", exact: true }).click();
    await controlSheet.waitFor({ state: "hidden" });

    // TASK-PANEL-01 S2: editing keeps fields this version does not know (e.g. from a newer app).
    const withExtras = await page.evaluate(() => window.workdesk.load());
    withExtras.notes.push({ id: "future-note", title: "미래 필드 메모", body: "본문", tags: ["가상"] });
    withExtras.events.push({ id: "future-event", title: "미래 필드 일정", at: new Date(Date.now() + 3600000).toISOString(), done: false, color: "green" });
    await page.evaluate((value) => window.workdesk.save(value), withExtras);
    await page.reload();
    await page.locator('.save-indicator[data-state="ready"]').waitFor();
    await page.locator("nav").getByRole("button", { name: "업무 메모", exact: true }).click();
    // TASK-PANEL-01 A1: row actions name their record, visible label first.
    await page.getByRole("button", { name: "수정 · 미래 필드 메모", exact: true }).click();
    await page.getByLabel("내용", { exact: true }).fill("본문 수정");
    await page.locator(".sheet[open]").getByRole("button", { name: "저장", exact: true }).click();
    await page.locator(".sheet[open]").waitFor({ state: "hidden" });
    await page.locator("nav").getByRole("button", { name: "월간 일정", exact: true }).click();
    await page.getByRole("tab", { name: "목록", exact: true }).click();
    await page.locator(".list-view-row").filter({ hasText: "미래 필드 일정" }).click();
    await page.getByLabel("일정 제목", { exact: true }).fill("미래 필드 일정 수정");
    await page.getByRole("button", { name: "변경 저장", exact: true }).click();
    await page.locator(".sheet[open]").waitFor({ state: "hidden" });
    const afterEdit = await page.evaluate(() => window.workdesk.load());
    assert.deepEqual(afterEdit.notes.find((n) => n.id === "future-note"), { id: "future-note", title: "미래 필드 메모", body: "본문 수정", tags: ["가상"] });
    const editedEvent = afterEdit.events.find((e) => e.id === "future-event");
    assert.equal(editedEvent.title, "미래 필드 일정 수정");
    assert.equal(editedEvent.color, "green");
    console.log(`PASS: 저장 중 키보드 포커스 유지·통제 종료일 오류 칸 연결·필수 표시, 순찰 복사(출처·채운 칸 안내·자동 제목·단속 건 제외), 편집 시 모르는 필드 보존(메모·일정), 행 동작 이름에 기록 제목, 보호본 실패 저장 경고·실제자료 갱신/재시도, 예정통제 해제 방지·현재통제 해제, 달력 주간·목록 등록·보기와 이동·보기 탭 키보드(roving)·주간 통제 원본 이동, 홈 상태 띠(당직·통제·기한 필터)·주 단위 이동, 목록 ${pages.length}개 화면의 진한 버튼 1개, ↑/↓ 행 이동, Enter 펼치기`);
  } finally {
    if (app) await app.close().catch(() => {});
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
