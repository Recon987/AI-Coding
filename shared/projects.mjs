// 사업·근거 보관함 (TASK-HUB-B2A-01, docs/product/claude-hub-schema-plan-2026-10-20.md 1·6장).
// Optional top-level collections `projects` (general projects) and `references` (one shared
// evidence store). AX projects stay in `axProjects`; both share one project ID space and are
// shown through ProjectView. Links to sources, projects and evidence may dangle (an older app
// can delete the target), so they are shown as deleted and never rejected.
// Pure: no DOM, Electron or network.
import { validDateKey } from "./dates.mjs";
import { AX_STAGES } from "./ax.mjs";

export const PROJECT_FIELDS = { facility: "시설", resource: "자원보전", ax: "AX", admin: "행정", general: "일반" };
export const PROJECT_STAGES = { planning: "기획", progress: "추진", hold: "보류", done: "완료" };
export const REFERENCE_KINDS = { folder: "폴더", snippet: "스니펫", file: "파일", docNo: "공문·문서번호", text: "메모" };
export const SOURCE_KINDS = { note: "메모", call: "전화메모", patrol: "순찰 기록" };
export const MAX_PROJECT_RECORDS = 10000;
export const MAX_REFERENCE_IDS = 50;
// AX stages shown as general stages; the AX record keeps its own stage.
const AX_STAGE_TO_GENERAL = { planning: "planning", contract: "progress", execution: "progress", done: "done" };
// Only the AX project stores field "ax"; a general project is one of these.
const GENERAL_FIELDS = ["facility", "resource", "admin", "general"];
const SOURCE_PAGES = { note: "notes", call: "calls", patrol: "patrol" };

const fail = (message) => {
  throw new Error(message);
};
const text = (v, max) => typeof v === "string" && v.length <= max;
const requiredText = (v, max) => text(v, max) && v.trim().length > 0;
const timestamp = (v) => typeof v === "string" && v.length <= 40 && Number.isFinite(Date.parse(v));
// The same absolute-path rule as `folders` (Windows drive, UNC or POSIX).
const absolutePath = (v) => requiredText(v, 4096) && /^(\/|[A-Za-z]:[\\/]|\\\\)/.test(v);

function checkList(list, label) {
  if (!Array.isArray(list) || list.length > MAX_PROJECT_RECORDS)
    fail(`${label}은(는) ${MAX_PROJECT_RECORDS.toLocaleString("ko-KR")}건 이하의 목록이어야 합니다.`);
  const ids = new Set();
  for (const row of list) {
    if (!row || typeof row !== "object" || !requiredText(row.id, 100) || ids.has(row.id))
      fail(`${label}의 ID를 확인하세요.`);
    ids.add(row.id);
  }
}

/** True for a valid `referenceIds` value: up to 50 distinct non-empty IDs. */
export function validReferenceIds(value) {
  return (
    Array.isArray(value) &&
    value.length <= MAX_REFERENCE_IDS &&
    value.every((id) => requiredText(id, 100)) &&
    new Set(value).size === value.length
  );
}

/** Throws unless every general project is valid. */
export function validateProjects(list) {
  checkList(list, "사업");
  for (const p of list) {
    if (!requiredText(p.title, 200)) fail("사업명을 입력하세요(200자 이하).");
    if (!GENERAL_FIELDS.includes(p.field)) fail("사업 분야를 선택하세요.");
    if (!Object.hasOwn(PROJECT_STAGES, p.stage)) fail("사업 단계를 선택하세요.");
    for (const [key, max] of [["manager", 100], ["nextMilestone", 500], ["risks", 4000], ["notes", 4000]])
      if (!text(p[key], max)) fail(`사업 내용이 너무 깁니다(${key}).`);
    if (!(p.nextMilestoneDate === null || validDateKey(p.nextMilestoneDate)))
      fail("사업의 다음 마일스톤 날짜를 확인하세요.");
    if (!validReferenceIds(p.referenceIds)) fail("사업의 근거 자료 목록을 확인하세요(50개 이하, 중복 없음).");
    if (!timestamp(p.updatedAt)) fail("사업의 수정 시각을 확인하세요.");
  }
  return list;
}

/** Throws unless every evidence entry is valid. Paths are kept as text and never opened here. */
export function validateReferences(list) {
  checkList(list, "근거 자료");
  for (const r of list) {
    if (!requiredText(r.title, 200)) fail("근거 자료 이름을 입력하세요(200자 이하).");
    if (!Object.hasOwn(REFERENCE_KINDS, r.kind)) fail("근거 자료 종류를 선택하세요.");
    if (!(r.targetId === null || requiredText(r.targetId, 100))) fail("근거 자료가 가리키는 기록을 확인하세요.");
    if (!(r.path === null || absolutePath(r.path))) fail("근거 파일의 절대 경로를 확인하세요.");
    if (!(r.docNo === null || requiredText(r.docNo, 100))) fail("공문·문서번호는 100자 이하로 입력하세요.");
    if (!text(r.note, 2000)) fail("근거 자료 메모는 2,000자 이하여야 합니다.");
    if (!timestamp(r.addedAt)) fail("근거 자료의 등록 시각을 확인하세요.");
    const needs = { folder: "targetId", snippet: "targetId", file: "path", docNo: "docNo" }[r.kind];
    if (needs && r[needs] === null) fail(`${REFERENCE_KINDS[r.kind]} 근거에 필요한 값이 없습니다.`);
  }
  return list;
}

/** Throws unless `source` is null or { kind, id, title } (title = the source's title when created). */
export function validateSource(source) {
  if (source === null) return source;
  if (
    !source ||
    typeof source !== "object" ||
    !Object.hasOwn(SOURCE_KINDS, source.kind) ||
    !requiredText(source.id, 100) ||
    !text(source.title, 200)
  )
    fail("작업의 출처를 확인하세요.");
  return source;
}

/**
 * Optional link fields on existing records: `tasks[].projectId`, `tasks[].referenceIds`,
 * `axProjects[].referenceIds`. Shape only — a target that no longer exists is allowed.
 * General and AX project IDs must not collide (one project ID space).
 */
export function validateProjectLinks(data) {
  const axIds = new Set((data.axProjects ?? []).map((p) => p.id));
  for (const p of data.projects ?? [])
    if (axIds.has(p.id)) fail("일반 사업과 AX 사업의 ID가 겹칩니다.");
  for (const t of data.tasks ?? []) {
    if (t.projectId !== undefined && !(t.projectId === null || requiredText(t.projectId, 100)))
      fail("업무에 연결된 사업을 확인하세요.");
    if (t.referenceIds !== undefined && !validReferenceIds(t.referenceIds))
      fail("업무의 근거 자료 목록을 확인하세요(50개 이하, 중복 없음).");
  }
  for (const p of data.axProjects ?? [])
    if (p.referenceIds !== undefined && !validReferenceIds(p.referenceIds))
      fail("AX 사업의 근거 자료 목록을 확인하세요(50개 이하, 중복 없음).");
}

/** Every project ID (general and AX): the one set project links are checked against. */
export function projectIdSet(data) {
  return new Set([...(data.projects ?? []), ...(data.axProjects ?? [])].map((p) => p.id));
}

/**
 * General and AX projects in one shape. `store` says where the record is edited.
 * `ext.ax` (권역·예산 천원·AX 단계) is included only while the AX module is shown.
 */
export function listProjects(data, { axEnabled = true } = {}) {
  const general = (data.projects ?? []).map((p) => ({
    id: p.id,
    store: "projects",
    title: p.title,
    field: p.field,
    stage: p.stage,
    manager: p.manager,
    nextMilestone: p.nextMilestone,
    nextMilestoneDate: p.nextMilestoneDate,
    risks: p.risks,
    notes: p.notes,
    referenceIds: p.referenceIds,
    updatedAt: p.updatedAt,
  }));
  const ax = (data.axProjects ?? []).map((p) => ({
    id: p.id,
    store: "axProjects",
    title: p.title,
    field: "ax",
    stage: AX_STAGE_TO_GENERAL[p.stage],
    manager: p.manager,
    nextMilestone: p.nextMilestone,
    nextMilestoneDate: p.nextMilestoneDate,
    risks: p.risks,
    notes: p.notes,
    referenceIds: p.referenceIds ?? [],
    updatedAt: p.updatedAt,
    ...(axEnabled
      ? {
          ext: {
            ax: {
              zone: p.zone,
              axStage: p.stage,
              axStageLabel: AX_STAGES[p.stage],
              budgetTotal: p.budgetTotal,
              budgetExecuted: p.budgetExecuted,
              partner: p.partner,
            },
          },
        }
      : {}),
  }));
  return [...general, ...ax];
}

/** The project a link points at, or a "deleted" marker; null when there is no link. */
export function projectRef(data, projectId) {
  if (projectId === null || projectId === undefined) return null;
  const found = listProjects(data, { axEnabled: false }).find((p) => p.id === projectId);
  return found ? { exists: true, id: found.id, title: found.title, field: found.field } : { exists: false, id: projectId, label: "사업 없음(삭제됨)" };
}

const recordsOf = { note: (d) => d.notes ?? [], call: (d) => d.calls ?? [], patrol: (d) => d.patrols ?? [] };
/**
 * How a work item's source is shown: the source's current title while it exists
 * ("출처: 전화메모 · <현재 제목>", openable), otherwise the stored title
 * ("출처: 삭제된 전화메모 — <사본 제목>", read-only).
 */
export function sourceView(data, source) {
  if (!source) return null;
  const kindLabel = SOURCE_KINDS[source.kind];
  const live = recordsOf[source.kind]?.(data).find((r) => r.id === source.id);
  return live
    ? { live: true, label: `출처: ${kindLabel} · ${live.title}`, page: SOURCE_PAGES[source.kind], id: source.id }
    : { live: false, label: `출처: 삭제된 ${kindLabel} — ${source.title}`, page: null, id: source.id };
}

/** Shown evidence for one ID: the entry, and whether the folder or snippet it points at still exists. */
export function referenceView(data, id) {
  const ref = (data.references ?? []).find((r) => r.id === id);
  if (!ref) return { exists: false, id, label: "삭제된 자료" };
  const target =
    ref.kind === "folder"
      ? (data.folders ?? []).find((f) => f.id === ref.targetId)
      : ref.kind === "snippet"
        ? (data.axSnippets ?? []).find((s) => s.id === ref.targetId)
        : undefined;
  const targetMissing = (ref.kind === "folder" || ref.kind === "snippet") && !target;
  return {
    exists: true,
    id,
    kind: ref.kind,
    kindLabel: REFERENCE_KINDS[ref.kind],
    label: targetMissing ? `${ref.title} (대상 없음)` : ref.title,
    targetMissing,
    // A folder's path comes from the live folder record, a file's from the entry itself.
    path: ref.kind === "folder" ? target?.path ?? null : ref.kind === "file" ? ref.path : null,
    docNo: ref.docNo,
  };
}
