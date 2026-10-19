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

// TASK-AXDESK-02: snippet library.
const { AX_EXAMPLE_SNIPPETS, examplesAdded, withExampleSnippets, validateAxSnippets } = require("../shared/ax.mjs");
const { visibleModules } = require("../shared/applets.mjs");
const NOW = "2026-10-19T09:00:00.000Z";

test("예제 3개: 고정 ID·예제 표시·검증 통과, 사용자가 넣을 때만 들어가고 다시 생기지 않는다", () => {
  assert.deepEqual(AX_EXAMPLE_SNIPPETS.map((s) => [s.id, s.category]), [
    ["example-gee-sentinel2", "gee"],
    ["example-dd-dms", "python"],
    ["example-report-prompt", "prompt"],
  ]);
  const base = normalize(empty());
  assert.equal(base.axSnippets.length, 0, "열기만 해서는 예제를 만들지 않음");
  assert.equal(examplesAdded(base), false);
  const seeded = normalize(withExampleSnippets(base, NOW));
  assert.equal(seeded.axSnippets.length, 3);
  assert.ok(seeded.axSnippets.every((s) => s.example === true && s.updatedAt === NOW));
  assert.doesNotThrow(() => validateAxSnippets(seeded.axSnippets));
  assert.equal(examplesAdded(seeded), true);
  // The mark lives in the AX module's settings; the menu stays as before.
  assert.deepEqual(visibleModules(seeded), visibleModules(base));
  // Deleting every example keeps the mark: nothing offers or refills them.
  const cleared = normalize({ ...seeded, axSnippets: [] });
  assert.equal(examplesAdded(cleared), true);
  // A second call never duplicates IDs.
  assert.equal(withExampleSnippets(seeded, NOW).axSnippets.length, 3);
  // The input is not changed.
  assert.equal(base.axSnippets.length, 0);
  assert.equal(Object.hasOwn(base, "modules"), false);
});

test("예제 넣기: 저장된 모듈 순서·다른 설정은 그대로, 읽을 수 없는 AX 설정은 덮지 않는다", () => {
  const saved = normalize({
    ...empty(),
    modules: {
      enabledModuleIds: ["ax-desk"],
      moduleOrder: ["office", "ax-desk", "future-tool", "patrols"],
      customConfigs: { patrols: { view: "list" }, "ax-desk": { pinned: ["x"] } },
    },
  });
  const out = normalize(withExampleSnippets(saved, NOW));
  assert.deepEqual(out.modules.moduleOrder, saved.modules.moduleOrder);
  assert.deepEqual(out.modules.enabledModuleIds, ["ax-desk"]);
  assert.deepEqual(out.modules.customConfigs, { patrols: { view: "list" }, "ax-desk": { pinned: ["x"], examplesAdded: true } });
  const odd = normalize({ ...empty(), modules: { enabledModuleIds: [], moduleOrder: [], customConfigs: { "ax-desk": "v9-format" } } });
  assert.throws(() => withExampleSnippets(odd, NOW), /읽을 수 없어 예제를 넣지 않았습니다/);
  assert.equal(odd.modules.customConfigs["ax-desk"], "v9-format");
});

test("스니펫 검색: 제목·분류·태그·설명·본문으로 찾고 스니펫 화면으로 연다", () => {
  const data = normalize(withExampleSnippets(normalize(empty()), NOW));
  for (const [query, id] of [
    ["Sentinel-2 구름", "example-gee-sentinel2"],
    ["Python", "example-dd-dms"],
    ["DMS", "example-dd-dms"],
    ["표기만 바꾸는", "example-dd-dms"],
    ["COPERNICUS/S2_SR_HARMONIZED", "example-gee-sentinel2"],
    ["[작성 필요]", "example-report-prompt"],
  ])
    assert.deepEqual(searchRecords(data, query).map((r) => [r.id, r.page]), [[id, "ax-snippets"]], query);
});

test("스니펫 본문: 한글·따옴표·탭·개행·HTML 글자·100,000자를 저장·다시 읽기 후 그대로 보존", () => {
  const store = require("../desktop/store.cjs");
  const fs = require("node:fs");
  const os = require("node:os");
  const path = require("node:path");
  const tricky = '한글 "큰따옴표" \'작은따옴표\' `백틱`\n\t탭\r\n<script>alert("x")</script> &amp; \\ 역슬래시\n\n끝';
  const big = ("가나다 abc \"q\"\n").repeat(10000).slice(0, 100000);
  assert.equal(big.length, 100000);
  const row = (id, snippet) => ({ id, title: id, category: "python", tags: ["태그"], snippet, description: "", updatedAt: NOW });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "workdesk-snippets-"));
  try {
    const file = path.join(dir, "workdesk.json");
    store.write(file, { ...empty(), axSnippets: [row("a", tricky), row("b", big)] });
    const back = store.read(file).axSnippets;
    assert.equal(back[0].snippet, tricky);
    assert.equal(back[1].snippet, big);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  assert.throws(() => normalize({ ...empty(), axSnippets: [row("c", big + "x")] }), /100,000자/);
});
