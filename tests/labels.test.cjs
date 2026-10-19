// TASK-LABELS-01 (C3·C8): one label map per value set, matching the validator and the TS types.
// The snapshot below is deliberate: adding a label is an enum extension that older apps
// reject, so it must also raise READER_VERSION and write minReader (TASK-SCHEMA-01).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const model = require("../shared/model.mjs");
const office = require("../shared/office.mjs");
const forms = require("../shared/forms.mjs");
const ax = require("../shared/ax.mjs");

const ALLOWED = {
  risk: ["normal", "attention", "urgent"],
  patrolKind: ["safety", "resource", "enforcement", "fire", "facility", "incident", "general"],
  outcome: ["guidance", "fine", "referral", "other"],
  controlReason: ["fire", "weather", "construction", "resource", "other"],
  recurrence: ["none", "daily", "weekly", "monthly", "yearly"],
  workType: ["work", "off", "leave", "trip", "base"],
  duty: ["none", "day", "night"],
  // AX Desk (TASK-MODULES-01): new collections only, so no READER_VERSION change.
  axZone: ["hq", "west", "north", "institute", "other"],
  axStage: ["planning", "contract", "execution", "done"],
  axSnippetCategory: ["gee", "python", "prompt", "policy"],
};
const MAPS = {
  risk: model.RISK_LABEL,
  patrolKind: model.PATROL_KINDS,
  outcome: model.OBSERVATION_OUTCOMES,
  controlReason: model.CONTROL_REASONS,
  recurrence: model.RECURRENCE_LABEL,
  workType: office.workTypes,
  duty: office.dutyTypes,
  axZone: ax.AX_ZONES,
  axStage: ax.AX_STAGES,
  axSnippetCategory: ax.AX_SNIPPET_CATEGORIES,
};
// The TS union each set must equal (src/types.ts), found by its declaration text.
const TYPE_SOURCES = {
  risk: /risk: ((?:"\w+"\s*\|?\s*)+);/,
  patrolKind: /type PatrolKind =((?:\s*\|\s*"\w+")+);/,
  outcome: /outcome: ((?:"\w+"\s*\|?\s*)+);/,
  controlReason: /reason: ((?:"\w+"\s*\|?\s*)+);/,
  recurrence: /type EventRecurrence =((?:\s*\|\s*"\w+")+);/,
  workType: /workType: ((?:"\w+"\s*\|?\s*)+);/,
  duty: /duty: ((?:"\w+"\s*\|?\s*)+);/,
  axZone: /type AxZone = ((?:"\w+"\s*\|?\s*)+);/,
  axStage: /type AxStage = ((?:"\w+"\s*\|?\s*)+);/,
  axSnippetCategory: /type AxSnippetCategory = ((?:"\w+"\s*\|?\s*)+);/,
};

test("허용값 스냅샷: 라벨 맵 키가 고정 목록과 같다(라벨 추가 = 자료 형식 확장)", () => {
  for (const [name, keys] of Object.entries(ALLOWED))
    assert.deepEqual(Object.keys(MAPS[name]), keys, name);
  assert.deepEqual(model.RECURRENCE, ALLOWED.recurrence);
  // 2: "referral" outcome (TASK-FORMS-02). Raise it again with the next enum extension.
  assert.equal(model.READER_VERSION, 2, "허용값을 늘리면 READER_VERSION도 올린다");
});

test("라벨 맵 키 = TypeScript 타입 유니언", () => {
  const types = fs.readFileSync(path.join(__dirname, "../src/types.ts"), "utf8");
  for (const [name, pattern] of Object.entries(TYPE_SOURCES)) {
    const found = types.match(pattern);
    assert.ok(found, `${name} 타입 선언을 찾지 못함`);
    const union = [...found[1].matchAll(/"(\w+)"/g)].map((m) => m[1]).sort();
    assert.deepEqual(union, [...ALLOWED[name]].sort(), name);
  }
});

// Smallest valid record for each value set, so the validator itself is exercised.
function withValue(name, value) {
  const data = model.empty();
  const patrol = {
    id: "p1", title: "가상 순찰", at: "2026-10-19T09:00:00+09:00", route: "가상 구간", observer: "가상 직원",
    findings: "", action: "", risk: "normal",
  };
  if (name === "risk") data.patrols.push({ ...patrol, risk: value });
  if (name === "patrolKind") data.patrols.push({ ...patrol, kind: value });
  if (name === "outcome")
    data.patrols.push({ ...patrol, observations: [{ id: "o1", type: "흡연", count: 1, outcome: value, note: "" }] });
  if (name === "controlReason")
    data.controls.push({ id: "c1", title: "가상 통제", zone: null, reason: value, start: "2026-10-19", end: null, note: "" });
  if (name === "recurrence")
    data.events.push({ id: "e1", title: "가상 일정", at: "2026-10-19T09:00:00+09:00", done: false, recurrence: value });
  if (name === "axZone" || name === "axStage")
    data.axProjects.push({
      id: "p1", title: "가상 사업", zone: name === "axZone" ? value : "hq", stage: name === "axStage" ? value : "planning",
      budgetTotal: 0, budgetExecuted: 0, manager: "", partner: "", nextMilestone: "", nextMilestoneDate: null,
      risks: "", notes: "", updatedAt: "2026-10-19T09:00:00+09:00",
    });
  if (name === "axSnippetCategory")
    data.axSnippets.push({ id: "s1", title: "가상", category: value, tags: [], snippet: "", description: "", updatedAt: "2026-10-19T09:00:00+09:00" });
  if (name === "workType" || name === "duty") {
    const workType = name === "workType" ? value : "work";
    data.organizations.push({ id: "org", code: "ORG", name: "가상 사무소", parentId: null });
    data.employees.push({ id: "emp", code: "001", name: "가상 직원", organizationId: "org", position: "담당", active: true });
    data.bases.push({ id: "b1", code: "B01", name: "가상 거점", organizationId: "org" });
    data.assignments.push({
      id: "a1", employeeId: "emp", date: "2026-10-19", note: "",
      baseId: workType === "base" ? "b1" : null, workType, duty: name === "duty" ? value : "none",
    });
  }
  return data;
}

test("검증기는 라벨 맵의 키만 허용한다", () => {
  for (const [name, keys] of Object.entries(ALLOWED)) {
    for (const key of keys) assert.doesNotThrow(() => model.normalize(withValue(name, key)), `${name}=${key}`);
    assert.throws(() => model.normalize(withValue(name, "future-value")), `${name}에 모르는 값`);
  }
});

test("근무 그룹·반복 문구 공용 함수", () => {
  assert.deepEqual([...office.WORK_GROUPS.working, ...office.WORK_GROUPS.off].sort(), [...ALLOWED.workType].sort());
  assert.equal(office.workGroup("trip"), "working");
  assert.equal(office.workGroup("leave"), "off");
  assert.equal(office.workGroup(undefined), null);
  assert.equal(model.isRecurring({ recurrence: "weekly" }), true);
  assert.equal(model.isRecurring({ recurrence: "none" }), false);
  assert.equal(model.isRecurring({}), false);
  assert.equal(model.recurrenceText({ recurrence: "weekly", repeatUntil: "2026-12-31" }), "매주 반복");
  assert.equal(model.recurrenceText({ recurrence: "weekly", repeatUntil: "2026-12-31" }, { until: true }), "매주 반복 (~2026-12-31)");
  assert.equal(model.recurrenceText({ recurrence: "none" }), "");
});

test("describeObservations 문구(브리핑·인계 본문)", () => {
  assert.equal(
    model.describeObservations([
      { id: "o1", type: "흡연", count: 2, outcome: "guidance", note: "" },
      { id: "o2", type: "불법 주차", count: 1, outcome: "fine", note: "" },
    ]),
    "흡연 2건(계도), 불법 주차 1건(과태료 부과)",
  );
  assert.equal(model.describeObservations([]), "");
  assert.equal(model.describeObservations(), "");
});

test("양식 출력 형식은 FORM_FORMATS 한 곳에서 정한다", () => {
  assert.deepEqual(forms.FORM_FORMATS, ["txt", "csv"]);
  const source = fs.readFileSync(path.join(__dirname, "../src/components/FormExport.tsx"), "utf8");
  assert.match(source, /FORM_FORMATS/, "화면도 같은 목록을 쓴다");
});
