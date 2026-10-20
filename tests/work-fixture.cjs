const { empty } = require("../shared/model.mjs");
const { newWork } = require("../shared/work.mjs");
/** 총 10,000건: 작업 3400·메모 2000·전화 1000·회의 500·기존 업무 500·순찰 100·연결 2500. */
function mixedWorkFixture() {
  const data = empty(), now = "2026-10-20T03:00:00.000Z";
  const body = "가상 업무 검토·협의·조치 결과와 다음 확인 사항. ".repeat(5);
  for (let i = 0; i < 3400; i++) data.workItems.push({ ...newWork({ id: `w${i}`, title: `가상 작업 ${i}`, body, now }), priority: i % 5 === 0 ? "high" : "normal", status: i % 7 === 0 ? "waiting" : "todo", due: i % 3 === 0 ? null : i % 3 === 1 ? { kind: "date", date: "2026-10-20" } : { kind: "datetime", at: now } });
  for (let i = 0; i < 2000; i++) data.notes.push({ id: `n${i}`, title: `가상 검토 메모 ${i}`, body });
  for (let i = 0; i < 1000; i++) data.calls.push({ id: `c${i}`, title: `가상 전화 ${i}`, body, phone: "000", done: false });
  for (let i = 0; i < 500; i++) {
    data.meetings.push({ id: `m${i}`, title: `가상 회의 ${i}`, body, at: now, attendees: "가상 담당", createdAt: now, updatedAt: now });
    data.tasks.push({ id: `t${i}`, title: `가상 기존 업무 ${i}`, body, kind: i % 2 ? "submission" : "handover", at: now, assignee: "가상 담당", destination: "", priority: "normal", remindMinutes: 60, patrolId: i < 100 ? `p${i}` : null, done: false, completedAt: null });
  }
  for (let i = 0; i < 100; i++) data.patrols.push({ id: `p${i}`, title: `가상 순찰 ${i}`, at: now, route: "가상 구간", observer: "가상 담당", findings: body, action: "", risk: "normal" });
  for (let i = 0; i < 2500; i++) data.links.push({ id: `l${i}`, from: { type: i < 2000 ? "note" : "call", id: i < 2000 ? `n${i}` : `c${i - 2000}` }, to: { type: "workItem", id: `w${i}` }, role: "followUp", createdAt: now });
  return data;
}
module.exports = { mixedWorkFixture };
