const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { empty, normalize, briefing, calendarItems } = require("../shared/model.mjs");
const { listProjects } = require("../shared/projects.mjs");
const { milestoneItems } = require("../shared/ax.mjs");
const { moduleBriefing, moduleDeadlines, projectFields, MODULE_CONTRACTS } = require("../shared/module-contracts.mjs");
const { referenceLocation } = require("../desktop/reference-location.cjs");
const { searchRecords } = require("../shared/search.mjs");
const now = "2026-10-20T03:00:00.000Z";

test("모듈 계약1: AX 기한·브리핑을 이전 형식 그대로 기여하고 숨겨도 원본 유지", () => {
  const data = empty();
  data.axProjects.push({ id: "a", title: "가상 AX", zone: "west", stage: "execution", budgetTotal: 1000, budgetExecuted: 1250, manager: "", partner: "", nextMilestone: "중간 점검", nextMilestoneDate: "2026-10-20", risks: "", notes: "", updatedAt: now });
  const original = structuredClone(data);
  const range = { startDate: "2026-10-19", endDate: "2026-10-25" };
  assert.equal(MODULE_CONTRACTS[0].contract, 1);
  assert.deepEqual(moduleDeadlines(data, range), milestoneItems(data.axProjects, range));
  assert.equal(calendarItems(data, range).filter((r) => r.category === "AX").length, 1);
  assert.match(briefing(data, "2026-10-20"), new RegExp(moduleBriefing(data, "2026-10-20").join("\n").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  const shown = listProjects(data)[0], hidden = listProjects(data, { axEnabled: false })[0];
  assert.equal(projectFields(shown).find((f) => f.id === "rate").value, "125%");
  assert.deepEqual(projectFields(hidden), []);
  assert.deepEqual(data, original);
});

test("근거 위치: 저장된 ID만 조회하고 파일이 없거나 대상 삭제면 실행하지 않고 상태 표시", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "reference-location-"));
  try {
    const file = path.join(dir, "가상 근거.txt"); fs.writeFileSync(file, "가상");
    const data = normalize({ ...empty(), references: [{ id: "r", title: "파일", kind: "file", path: file, targetId: null, docNo: null, note: "", addedAt: now }] });
    assert.deepEqual(referenceLocation(data, "r"), { state: "ready", path: file });
    assert.throws(() => referenceLocation(data, { path: file }));
    assert.equal(referenceLocation(data, file).state, "missing", "임의 경로를 ID로 보내도 파일로 해석하지 않음");
    fs.unlinkSync(file);
    assert.equal(referenceLocation(data, "r").state, "missing");
    assert.equal(data.references.length, 1);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("사업·근거 전역 검색은 원본 ID와 화면을 가리키고 문서번호·메모도 검색", () => {
  const data = empty();
  data.projects.push({ id: "p", title: "가상 시설", field: "facility", stage: "progress", manager: "담당", nextMilestone: "점검", nextMilestoneDate: null, risks: "", notes: "설계 확인", referenceIds: [], updatedAt: now });
  data.references.push({ id: "r", title: "가상 근거", kind: "docNo", targetId: null, path: null, docNo: "가상-123", note: "", addedAt: now });
  assert.deepEqual(searchRecords(normalize(data), "설계 확인").map((r) => [r.id, r.page]), [["p", "projects"]]);
  assert.deepEqual(searchRecords(normalize(data), "가상-123").map((r) => [r.id, r.page]), [["r", "references"]]);
});
