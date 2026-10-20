// TASK-HUB-B3A-01: fictional records for the rollup tests. Instants are built from local
// clock times (localDate), so every time zone sees the same local days.
const { empty, normalize } = require("../shared/model.mjs");
const { localDate } = require("../shared/dates.mjs");

const at = (date, hour = 10) => {
  const [y, m, d] = date.split("-").map(Number);
  return localDate(y, m - 1, d, hour).toISOString();
};
function rollupFixture() {
  const data = empty();
  const base = { body: "", owner: "", priority: "normal", remindMinutes: null, createdAt: at("2026-10-12"), updatedAt: at("2026-10-12") };
  const work = (id, over) => ({ id, title: `가상 작업 ${id}`, status: "todo", due: null, projectId: null, completedAt: null, ...base, ...over });
  data.projects.push({ id: "p1", title: "가상 탐방로 정비", field: "facility", stage: "progress", manager: "가상 담당", nextMilestone: "중간 점검",
    nextMilestoneDate: "2026-10-28", risks: "우천 시 지연", notes: "", referenceIds: ["r1", "r-gone"], updatedAt: at("2026-10-12") });
  data.axProjects.push({ id: "a1", title: "가상 AX 실증", zone: "west", stage: "execution", budgetTotal: 1000, budgetExecuted: 250, manager: "가상",
    partner: "가상 협력사", nextMilestone: "결과 보고", nextMilestoneDate: "2026-11-05", risks: "", notes: "", updatedAt: at("2026-10-12") });
  data.references.push({ id: "r1", title: "가상 공문", kind: "docNo", targetId: null, path: null, docNo: "가상-2026-77", note: "", addedAt: at("2026-10-12") });
  data.references.push({ id: "r2", title: "가상 도면", kind: "file", targetId: null, path: "C:\\가상\\도면.pdf", docNo: null, note: "", addedAt: at("2026-10-12") });
  data.calls.push({ id: "c1", title: "가상 민원 전화", body: "원본 통화 내용", phone: "", done: false });
  data.workItems.push(
    work("done-in", { title: "가상 데크 보수 확인", status: "done", completedAt: at("2026-10-21", 15), projectId: "p1", referenceIds: ["r1", "r2"], body: "가상 비공개 메모 본문" }),
    work("done-before", { title: "가상 지난주 완료", status: "done", completedAt: at("2026-10-16") }),
    work("open-overdue", { title: "가상 밀린 작업", status: "doing", due: { kind: "date", date: "2026-10-15" } }),
    work("open-next", { title: "가상 다음 주 작업", status: "waiting", due: { kind: "date", date: "2026-10-29" }, projectId: "p1" }),
    work("open-later", { title: "가상 먼 작업", due: { kind: "datetime", at: at("2026-11-20", 9) }, projectId: "a1" }),
    work("follow", { title: "가상 민원 회신", projectId: "gone-project" }),
  );
  data.links.push({ id: "l1", from: { type: "call", id: "c1" }, to: { type: "workItem", id: "follow" }, role: "followUp", createdAt: at("2026-10-20") });
  data.links.push({ id: "l2", from: { type: "note", id: "n-gone" }, to: { type: "workItem", id: "follow" }, role: "followUp", createdAt: at("2026-10-20"), sourceTitle: "가상 지운 회의 메모" });
  const task = (id, over) => ({ id, title: `가상 인계 ${id}`, body: "", kind: "handover", at: at("2026-10-22", 9), assignee: "가상 인수자", destination: "",
    priority: "normal", remindMinutes: 0, patrolId: null, done: false, completedAt: null, ...over });
  data.tasks.push(
    task("t-done", { title: "가상 제출 완료", kind: "submission", destination: "가상 부서", done: true, completedAt: at("2026-10-23", 11), projectId: "p1" }),
    task("t-open", { title: "가상 인계 진행", at: at("2026-10-27", 9) }),
  );
  data.notes.push({ id: "n1", title: "가상 날짜 없는 메모", body: "실적으로 세지 않음" });
  data.meetings.push({ id: "m1", title: "가상 주간 회의", body: "결정 사항", at: at("2026-10-20", 14), attendees: "가상 팀", createdAt: at("2026-10-20"), updatedAt: at("2026-10-20") });
  data.meetings.push({ id: "m0", title: "가상 지난 회의", body: "", at: at("2026-10-14", 14), attendees: "", createdAt: at("2026-10-14"), updatedAt: at("2026-10-14") });
  const patrol = (id, over) => ({ id, title: `가상 순찰 ${id}`, at: at("2026-10-21", 8), route: "가상 구간", observer: "가상 직원", findings: "", action: "", risk: "normal", ...over });
  data.patrols.push(
    patrol("pt1", { kind: "safety" }),
    patrol("pt2", { kind: "enforcement", risk: "attention", observations: [{ id: "o1", type: "흡연", count: 2, outcome: "guidance", note: "" }] }),
    patrol("pt3", { risk: "urgent", at: at("2026-10-25", 18) }),
    patrol("pt-old", { at: at("2026-10-18", 8) }),
  );
  return normalize(data);
}
const NOW_KEY = "2026-10-21";
const nowDate = () => {
  const [y, m, d] = NOW_KEY.split("-").map(Number);
  return localDate(y, m - 1, d, 12);
};
module.exports = { rollupFixture, at, nowDate, NOW_KEY };
