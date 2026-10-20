// TASK-AX-DATES-01 (Codex AX-DATE-01): dates the validators accept keep their year everywhere a
// date is rebuilt from parts. `new Date(y, m, d)` reads 0–99 as 1900–1999; localDate does not.
// Run under several time zones: TZ=UTC / Asia/Seoul / America/New_York / Pacific/Kiritimati / Pacific/Honolulu.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { localDate, validDateKey } = require("../shared/dates.mjs");
const { activeControls, briefing, calendarItems, dayKey, empty, expandEventOccurrences, normalize } = require("../shared/model.mjs");
const { milestoneItems, validateAxProjects } = require("../shared/ax.mjs");

const DATES = ["0001-10-21", "0004-02-29", "0099-10-21", "0099-12-31", "0100-10-21", "1999-10-21", "2026-10-21", "2028-02-29"];
const project = (date) => ({
  id: `p-${date}`, title: `가상 ${date}`, zone: "hq", stage: "planning", budgetTotal: 0, budgetExecuted: 0,
  manager: "", partner: "", nextMilestone: "가상 보고", nextMilestoneDate: date, risks: "", notes: "",
  updatedAt: "2026-10-19T00:00:00.000Z",
});

test("localDate·dayKey: 0001~0099년도 그대로, 연도는 4자리로", () => {
  for (const key of DATES) {
    assert.ok(validDateKey(key), key);
    const [y, m, d] = key.split("-").map(Number);
    const date = localDate(y, m - 1, d);
    assert.deepEqual([date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours()], [y, m, d, 0], key);
    assert.equal(dayKey(date), key);
  }
  // Roll-over still works like the Date constructor, across the 99 → 100 boundary too.
  assert.equal(dayKey(localDate(99, 11, 32)), "0100-01-01");
  assert.equal(dayKey(localDate(4, 1, 30)), "0004-03-01");
  assert.equal(localDate(2026, 9, 21, 9, 30).getHours(), 9);
  // Ordinary years behave exactly as before.
  assert.equal(localDate(2026, 9, 21).getTime(), new Date(2026, 9, 21).getTime());
});

test("AX 마일스톤: 허용한 날짜는 달력 파생 날짜와 같고 브리핑에도 그날 나온다", () => {
  const projects = validateAxProjects(DATES.map(project));
  const data = normalize({ ...empty(), axProjects: projects });
  for (const key of DATES) {
    const items = calendarItems(data, { startDate: key, endDate: key }).filter((i) => i.category === "AX");
    assert.deepEqual(items.map((i) => i.id), [`p-${key}`], key);
    assert.equal(dayKey(new Date(items[0].at)), key, key);
    assert.match(briefing(data, key), new RegExp(`AX 사업 마일스톤 \\(1\\)\\n- 가상 ${key} \\|`), key);
  }
  assert.equal(milestoneItems(projects, {}).length, DATES.length);
  // Nothing is dropped, moved or rewritten on save.
  assert.deepEqual(data.axProjects.map((p) => p.nextMilestoneDate), DATES);
});

test("탐방로 통제·반복 일정도 낮은 연도를 바꾸지 않는다", () => {
  const control = { id: "c1", title: "가상 통제", zone: null, reason: "weather", start: "0099-12-30", end: "0100-01-02", note: "" };
  const data = normalize({ ...empty(), controls: [control] });
  const days = calendarItems(data, { startDate: "0099-12-29", endDate: "0100-01-03" })
    .filter((i) => i.category === "통제")
    .map((i) => dayKey(new Date(i.at)));
  assert.deepEqual(days, ["0099-12-30", "0099-12-31", "0100-01-01", "0100-01-02"]);
  assert.equal(activeControls(data, "0100-01-01").length, 1);
  // Daily, monthly and yearly series stepping through the year 99 → 100 boundary.
  const at = localDate(99, 11, 30, 9).toISOString();
  const keys = (recurrence, startDate, endDate) =>
    expandEventOccurrences({ id: "e1", title: "가상 반복", at, done: false, recurrence }, { startDate, endDate }).map((o) => dayKey(new Date(o.at)));
  assert.deepEqual(keys("daily", "0099-12-30", "0100-01-01"), ["0099-12-30", "0099-12-31", "0100-01-01"]);
  // Year 100 is not a leap year: the 30th clamps to 0100-02-28.
  assert.deepEqual(keys("monthly", "0099-12-01", "0100-02-28"), ["0099-12-30", "0100-01-30", "0100-02-28"]);
  assert.deepEqual(keys("yearly", "0099-01-01", "0101-12-31"), ["0099-12-30", "0100-12-30", "0101-12-30"]);
});
