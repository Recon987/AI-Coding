// TASK-DATES-01: date-key arithmetic gives the same answer in every time zone.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const ZONES = ["Asia/Seoul", "UTC", "America/Los_Angeles", "Pacific/Kiritimati", "Pacific/Pago_Pago"];
const script = `
  const assert = require("node:assert/strict");
  const d = require("./shared/dates.mjs");
  // Sunday goes back to the previous Monday; a week can cross the year.
  assert.equal(d.weekStart("2026-10-18"), "2026-10-12");
  assert.equal(d.weekStart("2026-10-12"), "2026-10-12");
  assert.deepEqual(d.weekDays("2027-01-01"), ["2026-12-28","2026-12-29","2026-12-30","2026-12-31","2027-01-01","2027-01-02","2027-01-03"]);
  // Month ends, leap day and DST-change days move by exactly one calendar day.
  assert.equal(d.addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(d.addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(d.addDays("2026-03-08", 1), "2026-03-09");
  assert.equal(d.addDays("2026-11-01", 1), "2026-11-02");
  assert.equal(d.addDays("2026-12-31", 30), "2027-01-30");
  assert.equal(d.daysInclusive("2026-10-15", "2026-10-15"), 1);
  assert.equal(d.daysInclusive("2025-01-01", "2025-12-31"), 365);
  assert.deepEqual(d.periodRange("week", "2026-10-18"), { startDate: "2026-10-12", endDate: "2026-10-18" });
  assert.deepEqual(d.periodRange("month", "2028-02-10"), { startDate: "2028-02-01", endDate: "2028-02-29" });
  assert.deepEqual(d.periodRange("month", "2026-12-31"), { startDate: "2026-12-01", endDate: "2026-12-31" });
  assert.deepEqual(d.periodRange("30days", "2026-03-01"), { startDate: "2026-01-31", endDate: "2026-03-01" });
  assert.equal(d.validDateKey("2026-02-30"), false);
  assert.equal(d.validDateKey("2026-2-3"), false);
  assert.throws(() => d.addDays("2026-02-30", 1), /날짜 형식/);
  // Stored instants: zone-less text keeps its written day; zoned text allows one day before UTC.
  assert.equal(d.earliestLocalDay("2026-10-18T00:30:00"), "2026-10-18");
  assert.equal(d.earliestLocalDay("2026-10-18T00:30:00.000Z"), "2026-10-17");
  assert.equal(d.earliestLocalDay("2026-10-18T09:00:00+09:00"), "2026-10-17");
`;

test("날짜 계산(주 시작·하루 이동·기간·월말·윤일)은 시간대 5종에서 같은 결과", () => {
  for (const TZ of ZONES)
    execFileSync(process.execPath, ["-e", script], {
      cwd: path.resolve(__dirname, ".."),
      env: { ...process.env, TZ },
      stdio: "pipe",
    });
});

test("시간대 표시 없는 외부 반복 종료일 판정이 PC 시간대와 무관(Codex P3)", () => {
  const check = `
    const assert = require("node:assert/strict");
    const { normalize, empty } = require("./shared/model.mjs");
    const event = (at, repeatUntil) => ({ ...empty(), events: [{ id: "e", title: "x", at, done: false, recurrence: "daily", repeatUntil }] });
    assert.throws(() => normalize(event("2026-10-18T00:30:00", "2026-10-16")), /반복 종료일/);
    assert.throws(() => normalize(event("2026-10-18T00:30:00", "2026-10-17")), /반복 종료일/);
    normalize(event("2026-10-18T00:30:00", "2026-10-18"));
    normalize(event("2026-10-19T03:00:00.000Z", "2026-10-18"));
  `;
  for (const TZ of ZONES)
    execFileSync(process.execPath, ["-e", check], { cwd: path.resolve(__dirname, ".."), env: { ...process.env, TZ }, stdio: "pipe" });
});
