const { test } = require("node:test");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

for (const timezone of ["Asia/Seoul", "America/New_York"]) {
  test(`읽기용 날짜는 현지 달력일과 24시간제를 유지한다 (${timezone})`, () => {
    execFileSync(
      process.execPath,
      [
        "-e",
        `
        const assert = require("node:assert/strict");
        const { formatDate, formatTime, formatClock } = require("./shared/format.mjs");
        assert.equal(formatDate("2026-01-01"), "2026. 1. 1. (목)");
        assert.equal(formatDate("2024-02-29"), "2024. 2. 29. (목)");
        assert.equal(formatDate("2026-12-31"), "2026. 12. 31. (목)");
        assert.equal(formatDate("2026-10-15", {year:false}), "10. 15. (목)");
        assert.equal(formatDate("2026-10-15", {weekday:false}), "2026. 10. 15.");
        assert.equal(formatTime(new Date(2026, 9, 15, 0, 0)), "2026. 10. 15. 00:00");
        assert.equal(formatTime(new Date(2026, 9, 15, 13, 5)), "2026. 10. 15. 13:05");
        assert.equal(formatClock(new Date(2026, 9, 15, 0, 0)), "00:00");
        assert.equal(formatClock(new Date(2026, 9, 15, 23, 59)), "23:59");
        assert.equal(formatTime("2026-12-31T15:00:00Z"),
          process.env.TZ === "Asia/Seoul" ? "2027. 1. 1. 00:00" : "2026. 12. 31. 10:00");
        for (const invalid of ["", "not-a-date", "2026-02-29", "2026-04-31", "2026-13-01", new Date(NaN)]) {
          assert.equal(formatDate(invalid), "날짜 확인 필요");
          assert.equal(formatTime(invalid), "날짜 확인 필요");
          assert.equal(formatClock(invalid), "날짜 확인 필요");
        }
        `,
      ],
      { cwd: root, env: { ...process.env, TZ: timezone }, stdio: "pipe" },
    );
  });
}
