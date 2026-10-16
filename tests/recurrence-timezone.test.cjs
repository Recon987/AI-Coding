const { test } = require("node:test");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

test("장기 일간 반복은 DST 전환 후에도 현지 날짜·시각을 유지한다", () => {
  execFileSync(
    process.execPath,
    [
      "-e",
      `
    const assert = require("node:assert/strict");
    const { expandEventOccurrences, dayKey } = require("./shared/model.mjs");
    const event = {id:"dst", title:"점검", at:"2000-01-01T09:30:00", recurrence:"daily", done:false};
    for (const [startDate, endDate, expected, hours] of [
      ["2026-03-07", "2026-03-09", ["2026-03-07", "2026-03-08", "2026-03-09"], 23],
      ["2026-10-31", "2026-11-02", ["2026-10-31", "2026-11-01", "2026-11-02"], 25]
    ]) {
      const rows = expandEventOccurrences(event, {startDate,endDate});
      assert.deepEqual(rows.map(r => dayKey(new Date(r.at))), expected);
      assert.ok(rows.every(r => new Date(r.at).getHours() === 9 && new Date(r.at).getMinutes() === 30));
      assert.equal((Date.parse(rows[1].at) - Date.parse(rows[0].at)) / 3600000, hours);
    }
  `,
    ],
    {
      cwd: path.resolve(__dirname, ".."),
      env: { ...process.env, TZ: "America/New_York" },
      stdio: "pipe",
    },
  );
});
