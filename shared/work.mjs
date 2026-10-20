// B1: 원본 기록을 복제하지 않는 작업·후속 연결 계약. DOM/저장소 의존 없음.
import { validDateKey, localDate } from "./dates.mjs";
import { formatDate, formatTime } from "./format.mjs";
import { sourceView, validateSource } from "./projects.mjs";

export const WORK_STATUS = { todo: "할 일", doing: "진행 중", waiting: "대기", done: "완료" };
const ensure = (ok, message) => { if (!ok) throw new Error(message); };
const text = (v, max) => typeof v === "string" && v.length <= max;
const required = (v, max) => text(v, max) && v.trim().length > 0;
const object = (v) => v && typeof v === "object" && !Array.isArray(v);
const instant = (v) => text(v, 40) && /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(v) && validDateKey(v.slice(0, 10)) && Number.isFinite(Date.parse(v));
const localKey = (d) => `${String(d.getFullYear()).padStart(4, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const refs = { note: "notes", call: "calls", meeting: "meetings", patrol: "patrols" };
const names = { note: "메모", call: "전화메모", meeting: "회의 기록" };

export function validateWork(data) {
  const result = {};
  for (const key of ["workItems", "meetings", "links"]) {
    const rows = data[key] ?? (data[key] === undefined ? [] : null);
    ensure(Array.isArray(rows) && rows.length <= 10000, `${key}는 10,000건 이하 목록이어야 합니다.`);
    const ids = new Set();
    for (const row of rows) {
      ensure(object(row) && required(row.id, 100) && !ids.has(row.id), `${key}의 ID 또는 중복을 확인하세요.`);
      ids.add(row.id);
      ensure(instant(row.createdAt), "등록 일시를 확인하세요.");
      if (key === "links") {
        ensure(row.role === "followUp", "후속 연결 종류를 확인하세요.");
        ensure(object(row.from) && object(row.to) && Object.hasOwn(names, row.from.type) && required(row.from.id, 100) && row.to.type === "workItem" && required(row.to.id, 100), "후속 연결 출처·대상을 확인하세요.");
        validateSource({ kind: row.from.type, id: row.from.id, title: row.from.title ?? "" });
        // 삭제된 출처/작업 링크도 보존한다. ID 재작성이나 연쇄 삭제는 하지 않는다.
        continue;
      }
      ensure(required(row.title, 500) && text(row.body, 20000) && instant(row.updatedAt), "작업·회의 제목과 내용을 확인하세요.");
      if (key === "meetings") {
        ensure(instant(row.at) && text(row.attendees, 2000), "회의 시각·참석자를 확인하세요.");
        continue;
      }
      ensure(Object.hasOwn(WORK_STATUS, row.status) && ["normal", "high"].includes(row.priority) && text(row.owner, 100), "작업 상태·우선순위·담당자를 확인하세요.");
      if (row.source !== undefined) validateSource(row.source);
      ensure(row.projectId === null || required(row.projectId, 100), "사업 참조를 확인하세요.");
      ensure(row.completedAt === null || instant(row.completedAt), "작업 완료 일시를 확인하세요.");
      ensure((row.status === "done") === (row.completedAt !== null), "작업 완료 상태와 일시가 다릅니다.");
      const due = row.due;
      ensure(due === null || (object(due) && ((due.kind === "date" && validDateKey(due.date)) || (due.kind === "datetime" && instant(due.at)))), "작업 기한을 확인하세요.");
      ensure(row.remindMinutes === undefined || row.remindMinutes === null || (due?.kind === "datetime" && [0, 60, 1440].includes(row.remindMinutes)), "시각 알림은 일시 기한에서만 명시적으로 설정하세요.");
    }
    // B2a의 초기 workItems에는 알림 필드가 없다. 누락은 알림 없음으로만 보완한다.
    result[key] = key === "workItems" ? rows.map((row) => row.remindMinutes === undefined ? { ...row, remindMinutes: null } : row) : rows;
  }
  const pairs = new Set();
  for (const link of result.links) {
    const key = JSON.stringify([link.from.type, link.from.id, link.to.id]);
    ensure(!pairs.has(key), "같은 후속 연결이 중복되었습니다.");
    pairs.add(key);
  }
  return result;
}

export function newWork({ id, title = "", body = "", now = new Date().toISOString() }) {
  return { id, title, body, status: "todo", due: null, projectId: null, owner: "", priority: "normal", remindMinutes: null, createdAt: now, updatedAt: now, completedAt: null };
}
export function setWorkStatus(work, status, now = new Date().toISOString()) {
  ensure(Object.hasOwn(WORK_STATUS, status), "작업 상태를 확인하세요.");
  return { ...work, status, updatedAt: now, completedAt: status === "done" ? (work.completedAt ?? now) : null };
}
export function workDueKey(work) {
  return !work.due ? null : work.due.kind === "date" ? work.due.date : localKey(new Date(work.due.at));
}
export function dueState(work, now = new Date()) {
  if (work.status === "done") return "done";
  const key = workDueKey(work);
  if (!key) return "none";
  // 날짜만 기한은 해당 현지 날짜 전체를 포함한다. 임의 시각을 만들지 않는다.
  if (work.due.kind === "date") return key < localKey(now) ? "overdue" : key === localKey(now) ? "today" : "upcoming";
  return Date.parse(work.due.at) < now.getTime() ? "overdue" : key === localKey(now) ? "today" : "upcoming";
}
export function dueText(work) {
  return !work.due ? "기한 없음" : `${work.due.kind === "date" ? formatDate(work.due.date) : formatTime(work.due.at)} 마감`;
}
export function workCalendarItems(data) {
  return (data.workItems ?? []).filter((w) => w.due).map((w) => {
    const at = w.due.kind === "datetime" ? w.due.at : (() => {
      const [y, m, d] = w.due.date.split("-").map(Number);
      return localDate(y, m - 1, d).toISOString();
    })();
    return { id: w.id, key: `work:${w.id}`, title: w.title, at, done: w.status === "done", category: "작업", page: "work", allDay: w.due.kind === "date" };
  });
}
export function workReminders(data) {
  return (data.workItems ?? []).filter((w) => w.due?.kind === "datetime" && w.remindMinutes !== null).map((w) => ({ id: `work:${w.id}`, title: `작업 · ${w.title}`, at: new Date(Date.parse(w.due.at) - w.remindMinutes * 60000).toISOString(), done: w.status === "done" }));
}
export function sourceInfo(data, ref) {
  const row = (data[refs[ref.type]] ?? []).find((r) => r.id === ref.id);
  const view = sourceView(data, validateSource({ kind: ref.type, id: ref.id, title: ref.title ?? "" }));
  return { row, page: view.page, label: view.label };
}
export function followUps(data, ref) {
  const ids = new Set((data.links ?? []).filter((l) => l.role === "followUp" && l.from.type === ref.type && l.from.id === ref.id).map((l) => l.to.id));
  for (const work of data.workItems ?? []) if (work.source?.kind === ref.type && work.source.id === ref.id) ids.add(work.id);
  return (data.workItems ?? []).filter((w) => ids.has(w.id));
}
export function workSources(data, id) {
  const sources = (data.links ?? []).filter((l) => l.to.id === id && l.role === "followUp").map((l) => l.from);
  const legacy = (data.workItems ?? []).find((w) => w.id === id)?.source;
  if (legacy && !sources.some((s) => s.type === legacy.kind && s.id === legacy.id)) sources.push({ type: legacy.kind, id: legacy.id, title: legacy.title });
  return sources.map((ref) => ({ ...sourceInfo(data, ref), ref }));
}
/** 양 화면에서 사용하는 동일한 정렬. 원본 배열/상태는 바꾸지 않는다. */
export function unifiedWork(data, now = new Date()) {
  const rows = [
    ...(data.workItems ?? []).map((w) => ({ id: w.id, kind: "general", page: "work", title: w.title, body: w.body, owner: w.owner, priority: w.priority, done: w.status === "done", status: w.status, due: w.due, createdAt: w.createdAt, original: w })),
    ...data.tasks.map((t) => ({ id: t.id, kind: t.kind, page: t.kind, title: t.title, body: t.body, owner: t.assignee, priority: t.priority, done: t.done, status: t.done ? "done" : "todo", due: { kind: "datetime", at: t.at }, createdAt: "", original: t })),
  ];
  const order = { overdue: 0, today: 1, upcoming: 2, none: 3, done: 4 };
  return rows.map((r) => ({ ...r, state: dueState(r, now) })).sort((a, b) => {
    const group = order[a.state] - order[b.state];
    if (group) return group;
    if (a.due && b.due) {
      const key = workDueKey(a).localeCompare(workDueKey(b));
      if (key) return key;
      if (a.due.kind !== b.due.kind) return a.due.kind === "date" ? 1 : -1;
      const time = a.due.kind === "datetime" ? Date.parse(a.due.at) - Date.parse(b.due.at) : 0;
      if (time) return time;
    }
    return Number(b.priority === "high") - Number(a.priority === "high") || (a.createdAt && b.createdAt ? Date.parse(a.createdAt) - Date.parse(b.createdAt) : 0);
  });
}
