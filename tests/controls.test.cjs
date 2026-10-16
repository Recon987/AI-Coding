// Local-date rules are checked in Korean time regardless of the machine zone.
process.env.TZ = "Asia/Seoul";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { empty, normalize, activeControls, calendarItems, briefing } = require("../shared/model.mjs");
const store = require("../desktop/store.cjs");

const control = (fields = {}) => ({
  id: "c1",
  title: "백담사~대청봉 구간",
  zone: "2-1",
  reason: "fire",
  start: "2026-11-15",
  end: "2026-12-15",
  note: "",
  ...fields,
});
const withControls = (...controls) => ({ ...empty(), controls });

test("통제 목록이 없는 기존 v3 파일을 읽으면 빈 목록이 되고 다른 자료는 그대로다", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "workdesk-controls-"));
  try {
    const file = path.join(dir, "workdesk.json");
    const legacy = empty();
    delete legacy.controls;
    legacy.notes.push({ id: "n1", title: "메모", body: "" });
    fs.writeFileSync(file, JSON.stringify(legacy));
    const loaded = store.read(file);
    assert.deepEqual(loaded.controls, []);
    assert.deepEqual(loaded.notes, legacy.notes);
    store.write(file, loaded);
    assert.deepEqual(store.read(file), loaded);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("통제 기록을 검증한다: 사유·날짜 순서·담당구역·메모 길이·중복 ID", () => {
  assert.deepEqual(normalize(withControls(control(), control({ id: "c2", end: null, zone: null }))).controls.length, 2);
  const bad = (fields, message) => assert.throws(() => normalize(withControls(control(fields))), message);
  bad({ reason: "holiday" }, /사유/);
  bad({ start: "2026-02-30" }, /시작일/);
  bad({ end: "2026-11-14" }, /종료일/);
  bad({ title: " " }, /구간/);
  bad({ zone: "x".repeat(51) }, /담당구역/);
  bad({ note: "x".repeat(2001) }, /메모/);
  assert.throws(() => normalize(withControls(control(), control())), /ID/);
  assert.throws(() => normalize({ ...empty(), controls: {} }), /10,000/);
});

test("특정 날짜의 유효 통제: 시작·종료일 포함, 종료일 없음은 해제 시까지", () => {
  const data = withControls(control(), control({ id: "c2", title: "계곡 탐방로", reason: "weather", start: "2026-11-20", end: null }));
  assert.deepEqual(activeControls(data, "2026-11-14").map((c) => c.id), []);
  assert.deepEqual(activeControls(data, "2026-11-15").map((c) => c.id), ["c1"]);
  assert.deepEqual(activeControls(data, "2026-12-15").map((c) => c.id), ["c1", "c2"]);
  assert.deepEqual(activeControls(data, "2027-03-01").map((c) => c.id), ["c2"]);
  assert.throws(() => activeControls(data, "2026-13-01"), /날짜/);
});

test("달력은 요청 기간 안의 통제일만 파생하고 원본을 복제 저장하지 않는다", () => {
  const data = withControls(control({ start: "2026-10-30", end: "2026-11-02" }), control({ id: "open", start: "2026-11-01", end: null }));
  const items = calendarItems(data, { startDate: "2026-11-01", endDate: "2026-11-03" }).filter((i) => i.category === "통제");
  assert.deepEqual(items.map((i) => i.key), [
    "control:c1:2026-11-01",
    "control:open:2026-11-01",
    "control:c1:2026-11-02",
    "control:open:2026-11-02",
    "control:open:2026-11-03",
  ].sort((a, b) => a.slice(-10).localeCompare(b.slice(-10))));
  assert.equal(calendarItems(data).filter((i) => i.category === "통제").length, 0);
  assert.equal(data.controls.length, 2);
});

test("브리핑 TXT는 그날 유효한 통제를 먼저 보여준다", () => {
  const text = briefing(withControls(control({ note: "산불조심기간" })), "2026-11-20");
  assert.match(text, /탐방로 통제 \(1\)\n- 백담사~대청봉 구간 \| 담당구역 2-1 \| 산불 예방 \| 2026-11-15 ~ 2026-12-15\n  산불조심기간/);
  assert.match(briefing(withControls(control()), "2026-11-01"), /탐방로 통제 \(0\)/);
  assert.match(briefing(withControls(control({ end: null })), "2027-01-01"), /해제 시까지/);
});
