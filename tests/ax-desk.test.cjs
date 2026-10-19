// TASK-AXDESK-01: AX project milestones derived from axProjects (never copied), the briefing
// section, search and the execution-rate rules.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { calendarItems, briefing, empty, normalize } = require("../shared/model.mjs");
const { executionRate, milestoneItems, milestoneTitle } = require("../shared/ax.mjs");
const { searchRecords } = require("../shared/search.mjs");
const { withModules } = require("../shared/applets.mjs");

const project = (over = {}) => ({
  id: "a1",
  title: "가상 혼잡도 분석",
  zone: "hq",
  stage: "execution",
  budgetTotal: 1000,
  budgetExecuted: 250,
  manager: "가상 담당",
  partner: "가상 협력사",
  nextMilestone: "중간보고회",
  nextMilestoneDate: "2026-10-21",
  risks: "",
  notes: "",
  updatedAt: "2026-10-19T00:00:00.000Z",
  ...over,
});
const withProjects = (...projects) => normalize({ ...empty(), axProjects: projects });
const axRows = (data, range) => calendarItems(data, range).filter((i) => i.category === "AX");
const OCTOBER = { startDate: "2026-10-01", endDate: "2026-10-31" };

test("마일스톤 날짜가 있는 사업은 달력에 정확히 1개, 종일 항목으로 파생된다", () => {
  const data = withProjects(project(), project({ id: "a2", title: "날짜 없는 사업", nextMilestoneDate: null }));
  const rows = axRows(data, OCTOBER);
  assert.equal(rows.length, 1);
  assert.deepEqual(
    { id: rows[0].id, key: rows[0].key, page: rows[0].page, title: rows[0].title, done: rows[0].done },
    { id: "a1", key: "ax:a1", page: "ax", title: "가상 혼잡도 분석 · 중간보고회", done: false },
  );
  // All-day on the milestone date in local time (TZ is Asia/Seoul in the test run or UTC).
  const at = new Date(rows[0].at);
  assert.deepEqual([at.getFullYear(), at.getMonth() + 1, at.getDate(), at.getHours()], [2026, 10, 21, 0]);
  // Outside the range: nothing. Copies into events/tasks: never.
  assert.equal(axRows(data, { startDate: "2026-11-01", endDate: "2026-11-30" }).length, 0);
  assert.deepEqual([data.events.length, data.tasks.length], [0, 0]);
  assert.equal(milestoneTitle(project({ nextMilestone: "  " })), "가상 혼잡도 분석");
  assert.equal(milestoneItems(undefined, OCTOBER).length, 0, "필드가 없는 구버전 자료");
});

test("수정·삭제는 원본 하나만 바꾸고, 모듈을 꺼도 마일스톤은 남는다", () => {
  const data = withProjects(project());
  const moved = { ...data, axProjects: [project({ nextMilestoneDate: "2026-10-28", nextMilestone: "최종보고" })] };
  assert.deepEqual(axRows(moved, OCTOBER).map((i) => [i.title, new Date(i.at).getDate()]), [["가상 혼잡도 분석 · 최종보고", 28]]);
  assert.equal(axRows({ ...data, axProjects: [] }, OCTOBER).length, 0);
  const hidden = normalize({ ...data, modules: withModules(data, ["patrols"]) });
  assert.equal(hidden.modules.enabledModuleIds.includes("ax-desk"), false);
  assert.equal(axRows(hidden, OCTOBER).length, 1, "모듈 끔은 메뉴 숨김만");
  assert.match(briefing(hidden, "2026-10-21"), /AX 사업 마일스톤 \(1\)/);
  // A finished project's milestone shows as done.
  assert.equal(axRows(withProjects(project({ stage: "done" })), OCTOBER)[0].done, true);
});

test("브리핑: 그날 마일스톤만 한 줄씩, 없는 날은 구역을 만들지 않는다", () => {
  const data = withProjects(project(), project({ id: "a2", title: "가상 지도", zone: "north", stage: "contract", nextMilestone: "" }));
  const text = briefing(data, "2026-10-21");
  assert.match(text, /\nAX 사업 마일스톤 \(2\)\n- 가상 혼잡도 분석 \| 중간보고회 \| 본사 \| 수행\/실증\n- 가상 지도 \| 차기 마일스톤 \| 북부 \| 발주\/계약\n\n순찰 기록/);
  assert.doesNotMatch(briefing(data, "2026-10-20"), /AX 사업/);
  assert.doesNotMatch(briefing(normalize(empty()), "2026-10-21"), /AX 사업/);
});

test("통합 검색: 사업명·권역·담당·협력기관·마일스톤·메모로 찾고 AX 화면으로 연다", () => {
  const data = withProjects(project({ notes: "가상 드론 영상" }));
  for (const query of ["혼잡도", "본사", "가상 담당", "협력사", "중간보고", "2026-10-21", "드론", "수행/실증"])
    assert.deepEqual(searchRecords(data, query).map((r) => [r.id, r.page]), [["a1", "ax"]], query);
  assert.equal(searchRecords(normalize(empty()), "혼잡도").length, 0);
});

test("집행률: 예산 0은 계산하지 않고, 초과 집행은 실제 비율 그대로", () => {
  assert.equal(executionRate(project({ budgetTotal: 0, budgetExecuted: 0 })), null);
  assert.equal(executionRate(project({ budgetTotal: 0, budgetExecuted: 300 })), null);
  assert.equal(executionRate(project()), 0.25);
  assert.equal(executionRate(project({ budgetExecuted: 1130 })), 1.13);
  // Saved values stay as entered (no clamping to the budget).
  assert.equal(withProjects(project({ budgetExecuted: 1130 })).axProjects[0].budgetExecuted, 1130);
});
