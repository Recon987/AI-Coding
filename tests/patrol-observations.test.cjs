// Local-date rules are checked in Korean time regardless of the machine zone.
process.env.TZ = "Asia/Seoul";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { empty, normalize, patrolSummary, observationTypes, briefing, DEFAULT_OBSERVATION_TYPES } = require("../shared/model.mjs");
const store = require("../desktop/store.cjs");

const patrol = (fields = {}) => ({
  id: "p1",
  title: "계곡 순찰",
  at: "2026-10-15T01:00:00.000Z", // 10:00 KST
  route: "계곡안내소 → 쉼터",
  observer: "가상 담당",
  findings: "",
  action: "",
  risk: "normal",
  ...fields,
});
const obs = (fields = {}) => ({ id: "o1", type: "흡연", count: 1, outcome: "guidance", note: "", ...fields });
const withPatrols = (...patrols) => ({ ...empty(), patrols });

test("종류·담당구역·단속 건이 없는 기존 순찰은 그대로 읽고 저장한다", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "workdesk-patrol-"));
  try {
    const file = path.join(dir, "workdesk.json");
    const legacy = withPatrols(patrol());
    store.write(file, legacy);
    assert.deepEqual(store.read(file), legacy);
    assert.equal("observations" in store.read(file).patrols[0], false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("순찰 종류·담당구역·단속 건(위경도 포함)을 검증하고 왕복한다", () => {
  const data = withPatrols(
    patrol({
      kind: "enforcement",
      zone: "3-2구역",
      observations: [
        obs({ id: "o1", type: "샛길·출입금지구역 출입", count: 2, coordinates: { latitude: 37.65, longitude: 126.97 } }),
        obs({ id: "o2", type: "지정 장소 외 취사", count: 1, outcome: "fine", note: "현장 확인" }),
      ],
    }),
  );
  assert.deepEqual(normalize(JSON.parse(JSON.stringify(data))), data);
  const bad = (fields, message) =>
    assert.throws(() => normalize(withPatrols(patrol(fields))), message);
  bad({ kind: "patrol" }, /순찰 종류/);
  bad({ zone: "x".repeat(51) }, /담당구역/);
  bad({ observations: [obs({ type: " " })] }, /유형/);
  bad({ observations: [obs({ count: 0 })] }, /건수/);
  bad({ observations: [obs({ count: 1.5 })] }, /건수/);
  bad({ observations: [obs({ outcome: "arrest" })] }, /조치/);
  bad({ observations: [obs({ coordinates: { latitude: 91, longitude: 0 } })] }, /위도/);
  bad({ observations: [obs(), obs()] }, /유형/);
  bad({ observations: Array.from({ length: 51 }, (_, i) => obs({ id: `o${i}` })) }, /50개/);
  bad({ observations: [obs({ fineAmount: undefined, note: "x".repeat(501) })] }, /메모/);
});

test("기간 집계는 현지 날짜 기준으로 유형별 건수와 조치를 합산한다", () => {
  const data = withPatrols(
    patrol({ id: "a", kind: "enforcement", observations: [obs({ type: "흡연", count: 2 }), obs({ id: "o2", type: "샛길·출입금지구역 출입", count: 3, outcome: "fine" })] }),
    patrol({ id: "b", at: "2026-10-16T14:59:00.000Z", kind: "enforcement", observations: [obs({ type: " 흡연 ", count: 1, outcome: "other" })] }),
    patrol({ id: "c", at: "2026-10-18T15:00:00.000Z", observations: [obs({ count: 9 })] }), // 10-19 KST: outside
    patrol({ id: "d" }),
  );
  const summary = patrolSummary(data, { startDate: "2026-10-12", endDate: "2026-10-18" });
  assert.equal(summary.patrols, 3);
  assert.deepEqual(summary.byKind, [
    { kind: "enforcement", label: "단속", count: 2 },
    { kind: null, label: "종류 미지정", count: 1 },
  ]);
  assert.deepEqual(summary.observations, [
    { type: "흡연", count: 3, entries: 2, guidance: 2, fine: 0, other: 1 },
    { type: "샛길·출입금지구역 출입", count: 3, entries: 1, guidance: 0, fine: 3, other: 0 },
  ].sort((a, b) => b.count - a.count || a.type.localeCompare(b.type, "ko")));
  assert.equal(summary.totalCount, 6);
  assert.throws(() => patrolSummary(data, { startDate: "2026-13-01", endDate: "2026-10-18" }), /기간/);
  // TASK-POLISH-01: a reversed range is an input error, not an empty week.
  assert.throws(() => patrolSummary(data, { startDate: "2026-10-18", endDate: "2026-10-12" }), /시작일은 종료일보다/);
  assert.equal(patrolSummary(data, { startDate: "2026-10-15", endDate: "2026-10-15" }).patrols >= 0, true);
});

test("유형 제안은 기본 목록 뒤에 실제 기록한 새 유형을 덧붙인다", () => {
  const types = observationTypes(withPatrols(patrol({ observations: [obs({ type: "드론 비행" }), obs({ id: "o2", type: "흡연" })] })));
  assert.deepEqual(types.slice(0, DEFAULT_OBSERVATION_TYPES.length), DEFAULT_OBSERVATION_TYPES);
  assert.equal(types.at(-1), "드론 비행");
  assert.equal(types.filter((t) => t === "흡연").length, 1);
});

test("브리핑 TXT에 순찰 종류·담당구역·단속 건을 적고 없으면 생략한다", () => {
  const text = briefing(
    withPatrols(
      patrol({ kind: "enforcement", zone: "3-2구역", observations: [obs({ type: "흡연", count: 2 })] }),
      patrol({ id: "p2", title: "일반 기록" }),
    ),
    "2026-10-15",
  );
  assert.match(text, /계곡 순찰 \| 계곡안내소 → 쉼터 \| 가상 담당 \| 단속 \| 담당구역 3-2구역/);
  assert.match(text, /단속·확인: 흡연 2건\(계도\)/);
  assert.equal(text.match(/단속·확인:/g).length, 1);
});

test("빠른 순찰 입력: 새 초안은 기록자·종류·구역(복사 시 구간)만 가져오고 자동 제목은 종류·구역·시각", () => {
  const { newPatrolDraft, patrolAutoTitle } = require("../shared/model.mjs");
  const source = {
    id: "p1", title: "원본", at: "2026-10-15T01:00:00.000Z", route: "계곡 → 쉼터", observer: "가상 담당",
    findings: "샛길 확인", action: "안내", risk: "urgent", kind: "enforcement", zone: "3-2",
    coordinates: { latitude: 37.6, longitude: 126.9 },
    observations: [{ id: "o1", type: "흡연", count: 1, outcome: "guidance", note: "" }],
  };
  const at = "2026-10-16T05:30:00.000Z"; // 14:30 KST
  assert.deepEqual(newPatrolDraft(source, { route: source.route, at }), {
    id: "", title: "", at, route: "계곡 → 쉼터", observer: "가상 담당", kind: "enforcement", zone: "3-2",
    findings: "", action: "", risk: "normal",
  });
  assert.deepEqual(Object.keys(newPatrolDraft(undefined, { at })).sort(), ["action", "at", "findings", "id", "observer", "risk", "route", "title"]);
  assert.equal(newPatrolDraft({ ...source, kind: undefined, zone: undefined }, { at }).kind, undefined);
  assert.equal(patrolAutoTitle({ ...source, at }), "단속 3-2구역 14:30");
  assert.equal(patrolAutoTitle({ ...source, at, zone: "3구역" }), "단속 3구역 14:30");
  assert.equal(patrolAutoTitle({ ...source, at, kind: undefined, zone: " " }), "순찰 14:30");
});
