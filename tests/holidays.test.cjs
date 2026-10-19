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
