// TASK-PANEL-01 C1: global search and each screen's filter use the same text.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { empty } = require("../shared/model.mjs");
const { matches, searchRecords, searchText } = require("../shared/search.mjs");

const data = () => {
  const d = empty();
  d.patrols.push({
    id: "p1", title: "오전 순찰", at: "2026-10-15T01:00:00.000Z", route: "계곡 → 쉼터", observer: "가상 담당",
    findings: "", action: "", risk: "normal", kind: "enforcement", zone: "3-2",
    observations: [{ id: "o1", type: "흡연", count: 2, outcome: "guidance", note: "대피소 앞" }],
    coordinates: { latitude: 37.6512, longitude: 126.9771 },
  });
  d.controls.push({ id: "c1", title: "능선 탐방로", zone: "7", reason: "fire", start: "2026-10-01", end: null, note: "" });
  d.events.push({ id: "e1", title: "주간 회의", at: "2026-10-15T00:00:00.000Z", done: false, recurrence: "weekly" });
  d.notes.push({ id: "n1", title: "장비 메모", body: "무전기 배터리" });
  d.calls.push({ id: "k1", title: "민원 전화", body: "주차", phone: "010-0000-0000", done: false });
  return d;
};

test("전역 검색이 순찰 담당구역·종류·단속 유형·단속 메모·좌표로도 찾는다(화면 검색과 동일)", () => {
  const d = data();
  for (const q of ["3-2", "단속", "흡연", "대피소", "37.6512", "가상 담당"]) {
    assert.deepEqual(searchRecords(d, q).map((r) => r.id), ["p1"], q);
    assert.equal(matches(searchText.patrol(d.patrols[0]), q), true, q);
  }
});

test("기록 종류별 검색 대상과 결과 요약", () => {
  const d = data();
  assert.deepEqual(searchRecords(d, "산불").map((r) => r.page), ["controls"]);
  assert.deepEqual(searchRecords(d, "해제 시까지").map((r) => r.id), ["c1"]);
  assert.deepEqual(searchRecords(d, "매주").map((r) => r.id), ["e1"]);
  assert.deepEqual(searchRecords(d, "배터리").map((r) => r.page), ["notes"]);
  assert.deepEqual(searchRecords(d, "010-0000").map((r) => r.page), ["calls"]);
  const [row] = searchRecords(d, "장비");
  assert.deepEqual(row, { id: "n1", page: "notes", title: "장비 메모", text: "무전기 배터리" });
  assert.equal(searchRecords(d, "  ").length, 5, "빈 검색어는 전체");
  assert.equal(matches("ABC", " abc "), true);
});
