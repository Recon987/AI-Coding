// TASK-LOCATION-01: 담당구역 번호 목록 — optional `zones`, CSV import preview, patrol suggestions.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const store = require("../desktop/store.cjs");
const { empty, normalize } = require("../shared/model.mjs");
const { validateZones, zoneSuggestions, routeSuggestions, findZone, MAX_ZONES } = require("../shared/zones.mjs");
const { previewZoneImport } = require("../shared/zones-import.mjs");
store.retry.wait = () => {};

const zone = (code, over = {}) => ({ id: `z-${code}`, code, name: `가상 ${code}구역`, route: `가상 ${code} 구간`, active: true, ...over });
const ids = () => {
  let n = 0;
  return () => `new-${++n}`;
};

test("zones는 선택 항목: 없는 기존 자료도 열리고, 저장·다시 읽기에서 그대로", () => {
  assert.deepEqual(empty().zones, []);
  const { zones, ...old } = empty();
  assert.deepEqual(normalize(old).zones, [], "필드가 없는 기존 자료");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "workdesk-zones-"));
  try {
    const file = path.join(dir, "workdesk.json");
    const data = { ...empty(), zones: [zone("3-2"), zone("3-10", { active: false, route: "" })] };
    store.write(file, data);
    assert.deepEqual(store.read(file).zones, data.zones);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  // A patrol's zone stays free text: a code missing from the list is still valid.
  const patrol = { id: "p1", title: "가상 순찰", at: "2026-10-20T09:00:00", route: "가상 구간", observer: "가상", findings: "", action: "", risk: "normal", zone: "목록에 없음" };
  assert.equal(normalize({ ...empty(), zones: [zone("3-2")], patrols: [patrol] }).patrols[0].zone, "목록에 없음");
});

test("검증: 중복·공백·길이·사용 여부·건수는 저장 전에 거부", () => {
  for (const [list, message] of [
    [[zone("3-2"), zone("3-2", { id: "other" })], /두 번 있습니다/],
    [[zone(" 3-2")], /앞뒤 공백/],
    [[zone("")], /앞뒤 공백 없이 50자/],
    [[zone("x".repeat(51))], /50자/],
    [[zone("1", { name: "가".repeat(101) })], /이름은 100자/],
    [[zone("1", { route: "가".repeat(501) })], /500자/],
    [[zone("1", { active: "true" })], /사용 여부/],
    [[zone("1"), zone("2", { id: "z-1" })], /ID/],
    [Array.from({ length: MAX_ZONES + 1 }, (_, i) => zone(String(i))), /10,000건/],
  ])
    assert.throws(() => normalize({ ...empty(), zones: list }), message);
  assert.equal(validateZones([zone("1")]).length, 1);
});

test("CSV 반입 미리보기: 추가·수정·유지, 파일에 없는 구역은 유지, ID 유지, 원본 불변", () => {
  const data = normalize({ ...empty(), zones: [zone("3-1"), zone("3-2"), zone("9-9")] });
  const before = JSON.stringify(data);
  const csv = "﻿code,name,route,active\r\n3-1,가상 3-1구역,가상 3-1 구간,true\n3-2,바뀐 이름,\"가상, 쉼표 구간\",false\n4-1,가상 새 구역,,\n";
  const result = previewZoneImport(data, csv, ids());
  assert.deepEqual([result.added, result.updated, result.unchanged], [1, 1, 1]);
  assert.deepEqual(result.changes.map((c) => [c.line, c.action]), [[2, "유지"], [3, "수정"], [4, "추가"]]);
  const byCode = Object.fromEntries(result.data.zones.map((z) => [z.code, z]));
  assert.deepEqual(byCode["3-2"], { id: "z-3-2", code: "3-2", name: "바뀐 이름", route: "가상, 쉼표 구간", active: false });
  assert.deepEqual(byCode["4-1"], { id: "new-1", code: "4-1", name: "가상 새 구역", route: "", active: true });
  assert.ok(byCode["9-9"], "파일에 없는 기존 구역은 유지");
  assert.equal(JSON.stringify(data), before, "미리보기는 입력을 바꾸지 않음");
});

test("CSV 반입: 머리글·열 수·빈 번호·중복·active 값이 틀리면 행 번호와 함께 전체 거부", () => {
  const data = normalize(empty());
  for (const [csv, message] of [
    ["번호,이름\n1,가", /머리글은 code,name,route,active/],
    ["code,name,route,active\n", /반입할 자료 행이 없습니다/],
    ["code,name,route,active\n1,가,나", /2행: 열 수/],
    ["code,name,route,active\n1,가,,\n,나,,", /3행: 담당구역 번호\(code\)가 비어/],
    ["code,name,route,active\n1,가,,\n1,나,,", /3행: 파일 안에 번호 '1'가 두 번/],
    ["code,name,route,active\n1,가,,예", /2행: active는/],
    [`code,name,route,active\n${"x".repeat(51)},가,,`, /50자/],
  ])
    assert.throws(() => previewZoneImport(data, csv, ids()), message, csv);
});

test("순찰 입력 제안: 사용 중 구역만 번호 순, 구간은 구역 대표 구간 다음 최근 순찰 구간", () => {
  const patrols = [
    ["2026-10-18T09:00:00", "가상 A 구간"],
    ["2026-10-20T09:00:00", "가상 B 구간"],
    ["2026-10-19T09:00:00", "가상 A 구간"],
    ["2026-10-17T09:00:00", "  "],
  ].map(([at, route], i) => ({ id: `p${i}`, title: "가상", at, route, observer: "가상", findings: "", action: "", risk: "normal" }));
  const data = { ...empty(), patrols, zones: [zone("3-10"), zone("3-2"), zone("3-9", { active: false }), zone("1-1", { route: "가상 A 구간" })] };
  assert.deepEqual(zoneSuggestions(data).map((z) => z.code), ["1-1", "3-2", "3-10"]);
  assert.equal(findZone(data, " 3-2 ").name, "가상 3-2구역");
  assert.equal(findZone(data, ""), undefined);
  assert.deepEqual(routeSuggestions(data, "3-2"), ["가상 3-2 구간", "가상 B 구간", "가상 A 구간"]);
  assert.deepEqual(routeSuggestions(data, "1-1"), ["가상 A 구간", "가상 B 구간"], "중복 없이");
  assert.deepEqual(routeSuggestions(data, "없음"), ["가상 B 구간", "가상 A 구간"]);
  assert.equal(routeSuggestions(data, null, 1).length, 1);
});
