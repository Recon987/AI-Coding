// TASK-HOLIDAY-01: built-in holiday table (sources: docs/research/holidays.md).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { holidaysForYear, holidayName, LUNAR_TABLE_YEARS } = require("../shared/model.mjs");

const names = (year) => Object.fromEntries(holidaysForYear(year).map((h) => [h.date, h.name]));
const substitutes = (year) => holidaysForYear(year).filter((h) => h.substitute).map((h) => h.date);

test("같은 날 공휴일 두 개가 겹치면 대체공휴일은 하루만 생긴다", () => {
  assert.equal(names(2025)["2025-05-05"], "어린이날 · 부처님오신날");
  assert.equal(names(2025)["2025-05-06"], "대체공휴일");
  assert.equal(holidayName("2025-05-07"), null, "2025-05-07은 평일");
  assert.equal(names(2028)["2028-10-03"], "개천절 · 추석");
  assert.equal(names(2028)["2028-10-05"], "대체공휴일");
  assert.equal(holidayName("2028-10-06"), null, "2028-10-06은 평일");
  // Weekend substitutes still work as before.
  assert.deepEqual(substitutes(2025), ["2025-03-03", "2025-05-06", "2025-10-08"]);
  assert.deepEqual(substitutes(2026), ["2026-03-02", "2026-05-25", "2026-08-17", "2026-10-05"]);
});

test("노동절·제헌절은 2026년부터 공휴일이고 주말이면 대체공휴일이 붙는다", () => {
  assert.equal(holidayName("2025-05-01"), null);
  assert.equal(holidayName("2025-07-17"), null);
  assert.equal(holidayName("2026-05-01"), "노동절");
  assert.equal(holidayName("2026-07-17"), "제헌절");
  // 2027-05-01 and 2027-07-17 are Saturdays.
  assert.equal(holidayName("2027-05-03"), "대체공휴일");
  assert.equal(holidayName("2027-07-19"), "대체공휴일");
});

test("선거일·임시공휴일은 표에 있고 대체공휴일을 만들지 않는다", () => {
  assert.equal(holidayName("2025-01-27"), "임시공휴일");
  assert.equal(holidayName("2025-06-03"), "대통령선거일");
  assert.equal(holidayName("2026-06-03"), "지방선거일");
  assert.equal(holidayName("2028-04-12"), "국회의원선거일");
  assert.equal(holidayName("2026-06-04"), null);
});

test("음력 표 범위를 알려 준다", () => {
  assert.deepEqual(LUNAR_TABLE_YEARS, { first: 2025, last: 2035 });
  assert.ok(holidaysForYear(2035).some((h) => h.name === "추석"));
  assert.ok(!holidaysForYear(2036).some((h) => h.name === "추석"), "2036년은 음력 공휴일 없음");
  assert.equal(holidayName("2036-05-01"), "노동절", "양력 공휴일은 계속 계산");
});

test("사용자 공휴일: 검증·저장 왕복·이름 합치기·브리핑 기간에 반영, 대체공휴일은 만들지 않음", () => {
  const { normalize, empty, validateCustomHolidays, enforcementRange, briefing } = require("../shared/model.mjs");
  const custom = [
    { id: "h1", date: "2026-10-02", name: "임시공휴일" },
    { id: "h2", date: "2026-10-09", name: "기관 휴무" },
    { id: "h3", date: "2026-10-10", name: "가상 휴무" },
  ];
  assert.equal(holidayName("2026-10-02", custom), "임시공휴일");
  assert.equal(holidayName("2026-10-02"), null, "기본 표에는 없음");
  assert.equal(holidayName("2026-10-09", custom), "한글날 · 기관 휴무", "같은 날이면 이름을 합친다");
  const october = holidaysForYear(2026, custom).filter((h) => h.date.startsWith("2026-10"));
  assert.deepEqual(october.map((h) => h.date), ["2026-10-02", "2026-10-03", "2026-10-05", "2026-10-09", "2026-10-10"]);
  assert.equal(october.filter((h) => h.substitute).length, 1, "토요일 사용자 공휴일은 대체공휴일을 만들지 않음");
  // With Friday 10-02 off, the last working day before Tuesday 10-06 is Thursday 10-01.
  assert.deepEqual(enforcementRange("2026-10-06", custom), { startDate: "2026-10-01", endDate: "2026-10-05" });
  const data = { ...empty(), customHolidays: custom };
  assert.deepEqual(normalize(data).customHolidays, custom);
  assert.deepEqual(normalize(empty()).customHolidays, []);
  const { customHolidays, ...old } = empty();
  assert.deepEqual(normalize(old).customHolidays, [], "필드가 없는 기존 자료도 정상");
  assert.match(briefing(data, "2026-10-02"), /^공원 업무 수첩 \| 2026-10-02 \(임시공휴일\) 업무 브리핑/);
  for (const bad of [
    [{ id: "x", date: "2026-02-30", name: "없는 날" }],
    [{ id: "x", date: "2026-10-02", name: "" }],
    [{ id: "x", date: "2026-10-02", name: "가".repeat(31) }],
    [{ id: "x", date: "2026-10-02", name: "a" }, { id: "y", date: "2026-10-02", name: "b" }],
    [{ id: "x", date: "2026-10-02", name: "a" }, { id: "x", date: "2026-10-03", name: "b" }],
    Array.from({ length: 1001 }, (_, i) => ({ id: `h${i}`, date: `2027-01-01`, name: "a" })),
  ])
    assert.throws(() => normalize({ ...empty(), customHolidays: bad }), /추가 공휴일/);
  assert.equal(validateCustomHolidays(custom), custom);
});
