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

// TASK-PANEL-01 S1: a file saved in one zone must open in any other zone.
test("반복 종료일 읽기 검증은 PC 시간대와 무관하다(저장한 시간대가 달라도 파일 전체 거부 없음)", () => {
  const run = (tz, script) =>
    execFileSync(process.execPath, ["-e", script], {
      cwd: path.resolve(__dirname, ".."),
      env: { ...process.env, TZ: tz },
      stdio: "pipe",
    }).toString();
  // Saved in Los Angeles: 2026-10-18 20:00 local is 2026-10-19 03:00Z; ends the same local day.
  const saved = run(
    "America/Los_Angeles",
    `const { normalize, empty, dayKey } = require("./shared/model.mjs");
     const d = empty();
     const at = new Date("2026-10-18T20:00:00").toISOString();
     d.events.push({ id: "e1", title: "야간 점검", at, done: false, recurrence: "daily", repeatUntil: dayKey(new Date(at)) });
     process.stdout.write(JSON.stringify(normalize(d)));`,
  );
  for (const tz of ["Asia/Seoul", "UTC", "Pacific/Kiritimati", "Pacific/Pago_Pago", "America/Los_Angeles"])
    run(
      tz,
      `const assert = require("node:assert/strict");
       const { normalize } = require("./shared/model.mjs");
       const data = normalize(${JSON.stringify(JSON.parse(saved))});
       assert.equal(data.events[0].repeatUntil, "2026-10-18");`,
    );
  // A genuinely reversed rule (ends days before it starts) is still rejected everywhere.
  for (const tz of ["Asia/Seoul", "UTC"])
    run(
      tz,
      `const assert = require("node:assert/strict");
       const { normalize, empty } = require("./shared/model.mjs");
       const d = empty();
       d.events.push({ id: "e1", title: "x", at: "2026-10-18T03:00:00.000Z", done: false, recurrence: "daily", repeatUntil: "2026-10-15" });
       assert.throws(() => normalize(d), /반복 종료일은 일정 시작일 이후/);`,
    );
});
