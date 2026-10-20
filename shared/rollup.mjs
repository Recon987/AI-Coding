// 정리·보고 집계 (TASK-HUB-B3A-01, docs/product/claude-hub-schema-plan-2026-10-20.md 4.3장).
// One pass over the stored records builds the facts of a period; three renderers turn them
// into 주간 실적·계획 / 사업 추진보고 / 인수인계서 text (TXT or Markdown). 일일 브리핑 stays
// model.briefing(). Every fact keeps the Ref of the record it came from. Nothing is estimated:
// a memo without a date is never counted as work done, and AX money has no history, so no
// "change in execution rate" is reported. Pure: no DOM, Electron or network.
import { addDays, validDateKey, weekStart } from "./dates.mjs";
import { dayKey, describeObservations, PATROL_KINDS, RISK_LABEL } from "./model.mjs";
import { dueText, unifiedWork, workDueKey, workSources, WORK_STATUS } from "./work.mjs";
import { listProjects, PROJECT_FIELDS, PROJECT_STAGES, projectRef, referenceView } from "./projects.mjs";
import { AX_ZONES } from "./ax.mjs";

export const REPORT_TYPES = { weekly: "주간 실적·계획", project: "사업 추진보고", handover: "인수인계서" };
export const REPORT_FORMATS = ["txt", "md"];
const KIND_LABEL = { general: "작업", handover: "인수인계", submission: "제출" };
const NOTE = "현재 자료 기준 초안입니다. 확정 보고서가 아니며, 날짜가 없는 메모나 이력이 없는 값(예: 집행률 변화)은 넣지 않았습니다.";
const NO_PROJECT = "사업 없음";

const fail = (message) => {
  throw new Error(message);
};
/** Monday–Sunday of the week containing `date` (a YYYY-MM-DD key). */
export function weekOf(date) {
  if (!validDateKey(date)) fail("보고 기준 날짜를 확인하세요.");
  const start = weekStart(date);
  return { start, end: addDays(start, 6) };
}
const localDay = (instant) => (instant ? dayKey(new Date(instant)) : null);
const inRange = (key, start, end) => key !== null && key >= start && key <= end;
const refKey = (ref) => `${ref.type}:${ref.id}`;
const byDateTitle = (a, b) =>
  (a.date ?? "9999-99-99").localeCompare(b.date ?? "9999-99-99") || a.title.localeCompare(b.title, "ko") || a.ref.id.localeCompare(b.ref.id);

// One fact row: what it is, where it came from, and the links a reader may want to follow.
function itemOf(data, row, date) {
  const isWork = row.kind === "general";
  const project = projectRef(data, row.original.projectId ?? null);
  return {
    ref: { type: isWork ? "workItem" : "task", id: row.id },
    kind: KIND_LABEL[row.kind],
    title: row.title,
    date,
    status: isWork ? WORK_STATUS[row.status] : row.done ? "완료" : "진행 중",
    due: row.due ? dueText(row) : "기한 없음",
    overdue: row.state === "overdue",
    owner: row.owner || "",
    projectId: project?.id ?? null,
    projectTitle: project ? (project.exists ? project.title : project.label) : NO_PROJECT,
    sources: isWork ? workSources(data, row.id).map((s) => s.label) : [],
    references: (row.original.referenceIds ?? []).map((id) => referenceView(data, id)),
    body: row.body ?? "",
  };
}

/**
 * Facts for [start, end] (local dates, both included):
 * - done: work items and 인수인계·제출 completed in the period (by completedAt);
 * - meetings: meetings held in the period (not filtered by project: B1 meetings have no project);
 * - open: everything not done now, whatever the period ("현재 상태");
 * - next: open items due in the seven days after `end`;
 * - patrol: counts for the period (no personal details, no fine amounts);
 * - milestones: AX/general project milestones in the seven days after `end`.
 * `projectId`: undefined = all, null = 사업 없음 only, string = that project.
 * `exclude`: "type:id" keys the user left out of the report.
 */
export function collectRollup(data, { start, end, projectId, exclude = [] } = {}, now = new Date()) {
  if (!validDateKey(start) || !validDateKey(end) || start > end) fail("보고 기간을 확인하세요.");
  const skip = new Set(exclude);
  const nextStart = addDays(end, 1);
  const nextEnd = addDays(end, 7);
  const matchesProject = (item) => projectId === undefined || item.projectId === projectId;
  const rows = unifiedWork(data, now);
  const unique = (items) => {
    const seen = new Set();
    return items.filter((i) => !skip.has(refKey(i.ref)) && !seen.has(refKey(i.ref)) && seen.add(refKey(i.ref))).sort(byDateTitle);
  };
  const done = unique(
    rows
      .filter((r) => r.done)
      .map((r) => itemOf(data, r, localDay(r.original.completedAt)))
      .filter((i) => inRange(i.date, start, end) && matchesProject(i)),
  );
  const openRows = rows.filter((r) => !r.done).map((r) => ({ row: r, item: itemOf(data, r, workDueKey(r)) })).filter(({ item }) => matchesProject(item));
  const open = unique(openRows.map(({ item }) => item));
  const next = unique(openRows.filter(({ item }) => inRange(item.date, nextStart, nextEnd)).map(({ item }) => item));
  const meetings =
    projectId === undefined
      ? unique(
          (data.meetings ?? [])
            .map((m) => ({ ref: { type: "meeting", id: m.id }, kind: "회의", title: m.title, date: localDay(m.at), attendees: m.attendees, body: m.body ?? "" }))
            .filter((m) => inRange(m.date, start, end)),
        )
      : [];
  const patrols = projectId === undefined ? (data.patrols ?? []).filter((p) => inRange(localDay(p.at), start, end)) : [];
  const byKind = {};
  for (const p of patrols) {
    const label = p.kind ? PATROL_KINDS[p.kind] : "구분 없음";
    byKind[label] = (byKind[label] ?? 0) + 1;
  }
  const patrol = {
    count: patrols.length,
    attention: patrols.filter((p) => p.risk === "attention").length,
    urgent: patrols.filter((p) => p.risk === "urgent").length,
    byKind,
    observations: describeObservations(patrols.flatMap((p) => p.observations ?? [])),
    refs: patrols.map((p) => ({ type: "patrol", id: p.id })),
  };
  const milestones = listProjects(data)
    .filter((p) => inRange(p.nextMilestoneDate, nextStart, nextEnd) && (projectId === undefined || p.id === projectId))
    .map((p) => ({ ref: { type: p.store === "axProjects" ? "axProject" : "project", id: p.id }, kind: "마일스톤", title: `${p.title} · ${p.nextMilestone || "다음 마일스톤"}`, date: p.nextMilestoneDate }))
    .filter((m) => !skip.has(refKey(m.ref)))
    .sort(byDateTitle);
  return { start, end, nextStart, nextEnd, projectId, done, meetings, open, next, patrol, milestones };
}

// ---- rendering ----
function writer(format) {
  const lines = [];
  return {
    title: (t) => lines.push(format === "md" ? `# ${t}` : t, format === "md" ? "" : "=".repeat(Math.min(40, t.length * 2))),
    section: (t) => lines.push("", format === "md" ? `## ${t}` : `■ ${t}`),
    sub: (t) => lines.push(format === "md" ? `### ${t}` : `[${t}]`),
    item: (t) => lines.push(`- ${t}`),
    detail: (t) => lines.push(`  ${format === "md" ? "- " : "· "}${t}`),
    text: (t) => lines.push(t),
    done: () => lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n",
  };
}
function itemLine(i) {
  const parts = [`[${i.kind}] ${i.title}`];
  if (i.status && i.status !== "완료") parts.push(i.status);
  if (i.due && i.status !== "완료") parts.push(i.overdue ? `기한 경과(${i.due})` : i.due);
  if (i.owner) parts.push(`담당 ${i.owner}`);
  return parts.join(" · ");
}
function itemDetails(w, i, { includeBodies, includePaths }) {
  for (const s of i.sources ?? []) w.detail(s);
  for (const r of i.references ?? []) {
    if (!r.exists) {
      w.detail(`근거: ${r.label}`);
      continue;
    }
    const extra = [r.docNo, includePaths ? r.path : null].filter(Boolean).join(", ");
    w.detail(`근거(${r.kindLabel}): ${r.label}${extra ? ` (${extra})` : ""}`);
  }
  if (includeBodies && i.body?.trim()) w.detail(`내용: ${i.body.trim().replace(/\s+/g, " ")}`);
}
function list(w, items, empty, options, { withDate = false } = {}) {
  if (!items.length) return w.item(empty);
  for (const i of items) {
    w.item(`${withDate && i.date ? `${i.date} ` : ""}${itemLine(i)}`);
    itemDetails(w, i, options);
  }
}
// Items grouped by project title, "사업 없음" last.
function grouped(w, items, empty, options, extra) {
  if (!items.length) return w.item(empty);
  const groups = new Map();
  for (const i of items) groups.set(i.projectTitle, [...(groups.get(i.projectTitle) ?? []), i]);
  const names = [...groups.keys()].sort((a, b) => (a === NO_PROJECT) - (b === NO_PROJECT) || a.localeCompare(b, "ko"));
  for (const name of names) {
    w.sub(name);
    list(w, groups.get(name), empty, options, extra);
  }
}
function patrolSection(w, patrol) {
  w.section("현장 순찰");
  if (!patrol.count) return w.item("기간 중 순찰 기록 없음");
  const kinds = Object.entries(patrol.byKind).sort(([a], [b]) => a.localeCompare(b, "ko")).map(([k, n]) => `${k} ${n}건`).join(", ");
  w.item(`순찰 ${patrol.count}건 (${kinds})`);
  if (patrol.attention || patrol.urgent)
    w.item(`${RISK_LABEL.attention} ${patrol.attention}건, ${RISK_LABEL.urgent} ${patrol.urgent}건`);
  if (patrol.observations) w.item(`단속·확인: ${patrol.observations}`);
}
const fileDate = (r) => `${r.start}_${r.end}`;
const safeName = (text) => text.replace(/[\\/:*?"<>|\n\r\t]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60) || "사업";

/**
 * Report text from a rollup. options: format "txt" | "md", includeBodies / includePaths
 * (both off by default: memo bodies and real file paths are left out unless chosen),
 * axEnabled (AX money shown only while the AX module is on).
 */
export function renderReport(type, data, rollup, { format = "txt", includeBodies = false, includePaths = false, axEnabled = true } = {}) {
  if (!Object.hasOwn(REPORT_TYPES, type)) fail("보고서 유형을 확인하세요.");
  if (!REPORT_FORMATS.includes(format)) fail("보고서 형식을 확인하세요.");
  const options = { includeBodies, includePaths };
  const w = writer(format);
  const period = `${rollup.start} ~ ${rollup.end}`;
  if (type === "weekly") {
    w.title(`${REPORT_TYPES.weekly} (${period})`);
    w.section("이번 주 실적");
    grouped(w, rollup.done, "기간 중 완료한 업무 없음", options, { withDate: true });
    w.section("회의");
    list(w, rollup.meetings, "기간 중 회의 기록 없음", options, { withDate: true });
    patrolSection(w, rollup.patrol);
    w.section(`다음 주 계획 (${rollup.nextStart} ~ ${rollup.nextEnd})`);
    list(w, rollup.next, "다음 주 기한 업무 없음", options, { withDate: true });
    if (rollup.milestones.length) {
      w.sub("사업 마일스톤");
      list(w, rollup.milestones, "", options, { withDate: true });
    }
    w.section("진행 중·대기 (현재 상태)");
    grouped(w, rollup.open, "진행 중인 업무 없음", options);
  }
  if (type === "project") {
    const project = listProjects(data, { axEnabled }).find((p) => p.id === rollup.projectId);
    if (!project) fail("사업 추진보고는 사업 하나를 골라야 합니다.");
    w.title(`${REPORT_TYPES.project} — ${project.title} (${period})`);
    w.section("사업 개요");
    w.item(`분야: ${PROJECT_FIELDS[project.field]} · 단계: ${PROJECT_STAGES[project.stage]}${project.manager ? ` · 담당: ${project.manager}` : ""}`);
    if (project.ext?.ax) {
      const ax = project.ext.ax;
      w.item(`AX 권역: ${AX_ZONES[ax.zone]} · AX 단계: ${ax.axStageLabel}`);
      w.item(`사업비 ${ax.budgetTotal.toLocaleString("ko-KR")}천원 · 집행액 ${ax.budgetExecuted.toLocaleString("ko-KR")}천원 (현재 값)`);
    }
    if (project.nextMilestone || project.nextMilestoneDate)
      w.item(`다음 마일스톤: ${project.nextMilestone || "-"}${project.nextMilestoneDate ? ` (${project.nextMilestoneDate})` : ""}`);
    if (project.risks.trim()) w.item(`위험·쟁점: ${project.risks.trim().replace(/\s+/g, " ")}`);
    w.section("기간 실적");
    list(w, rollup.done, "기간 중 완료한 업무 없음", options, { withDate: true });
    w.section("진행 중·대기 (현재 상태)");
    list(w, rollup.open, "진행 중인 업무 없음", options);
    w.section(`향후 계획 (${rollup.nextStart} ~ ${rollup.nextEnd})`);
    list(w, [...rollup.next, ...rollup.milestones].sort(byDateTitle), "다음 기간 기한 없음", options, { withDate: true });
    w.section("근거 자료");
    const refs = project.referenceIds.map((id) => referenceView(data, id));
    if (!refs.length) w.item("연결된 근거 자료 없음");
    for (const r of refs) w.item(r.exists ? `${r.kindLabel}: ${r.label}${r.docNo ? ` (${r.docNo})` : ""}${includePaths && r.path ? ` (${r.path})` : ""}` : r.label);
  }
  if (type === "handover") {
    w.title(`${REPORT_TYPES.handover} (${period})`);
    w.section("인계할 업무 (현재 미완료 전체)");
    grouped(w, rollup.open, "인계할 미완료 업무 없음", options);
    w.section(`다음 주 기한 (${rollup.nextStart} ~ ${rollup.nextEnd})`);
    list(w, rollup.next, "다음 주 기한 업무 없음", options, { withDate: true });
    w.section("기간 중 회의");
    list(w, rollup.meetings, "기간 중 회의 기록 없음", options, { withDate: true });
    w.section("기간 중 완료");
    list(w, rollup.done, "기간 중 완료한 업무 없음", options, { withDate: true });
  }
  w.text("");
  w.text(`※ ${NOTE}`);
  const projectName = type === "project" ? `-${safeName(listProjects(data).find((p) => p.id === rollup.projectId)?.title ?? "")}` : "";
  return {
    title: REPORT_TYPES[type],
    filename: `${REPORT_TYPES[type].replace("·", "")}${projectName}-${fileDate(rollup)}.${format}`,
    content: w.done(),
  };
}
