const { test } = require("node:test");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

test("B1: 다섯 시간대에서 날짜 기한·DST·낮은 연도·가짜 알림 제외가 같다", () => {
  for (const tz of ["Asia/Seoul", "UTC", "Pacific/Kiritimati", "Pacific/Pago_Pago", "America/New_York"]) {
    execFileSync(process.execPath, ["-e", `
      const assert = require("node:assert/strict");
      const { empty, normalize, calendarItems, reminderItems, dayKey } = require("./shared/model.mjs");
      const { newWork, dueState, dueText } = require("./shared/work.mjs");
      const { addDays, localDate } = require("./shared/dates.mjs");
      for (const date of ["2026-10-20", "2026-03-08", "2026-11-01", "0099-01-02"]) {
        const [y,m,d] = date.split("-").map(Number);
        const now = localDate(y, m-1, d, 23, 59);
        const data = empty();
        for (const [id, key] of [["yesterday", addDays(date,-1)], ["today", date], ["tomorrow", addDays(date,1)]])
          data.workItems.push({...newWork({id,title:id}), due:{kind:"date",date:key}});
        const roundtrip = normalize(JSON.parse(JSON.stringify(data)));
        assert.deepEqual(roundtrip.workItems.map(w=>dueState(w,now)),["overdue","today","upcoming"]);
        const rows = calendarItems(roundtrip,{startDate:date,endDate:date});
        assert.equal(rows.length,1); assert.equal(rows[0].id,"today");
        assert.equal(dayKey(new Date(rows[0].at)), date);
        assert.equal(rows[0].allDay,true);
        assert.equal(reminderItems(roundtrip).length,0);
        assert.doesNotMatch(dueText(roundtrip.workItems[1]),/00:00/);
        assert.equal(roundtrip.workItems[1].due.date,date);
      }
    `], { cwd: path.resolve(__dirname, ".."), env: { ...process.env, TZ: tz }, stdio: "pipe" });
  }
});
