// AX Desk records (TASK-MODULES-01, docs/specs/modular-ax/implementation.md 5장).
// Optional top-level collections axProjects and axSnippets. Enum values are stable keys;
// screens show the labels. Money is in thousand won (천원). Pure: no DOM, Electron or network.
import { validDateKey } from "./dates.mjs";

export const AX_ZONES = { hq: "본사", west: "서부", north: "북부", institute: "연구원·보전원", other: "기타" };
export const AX_STAGES = { planning: "기획", contract: "발주/계약", execution: "수행/실증", done: "검수/완료" };
export const AX_SNIPPET_CATEGORIES = { gee: "GEE", python: "Python", prompt: "프롬프트", policy: "법령·지침" };
export const MAX_AX_RECORDS = 10000;
// Largest amount accepted, in thousand won (1조 원 = 1,000,000,000천원).
const MAX_AMOUNT = 1e9;
const MAX_SNIPPET_LENGTH = 100000;

const fail = (message) => {
  throw new Error(message);
};
const text = (v, max) => typeof v === "string" && v.length <= max;
const requiredText = (v, max) => text(v, max) && v.trim().length > 0;
const timestamp = (v) => typeof v === "string" && v.length <= 40 && Number.isFinite(Date.parse(v));
const amount = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= MAX_AMOUNT;

function checkList(list, label) {
  if (!Array.isArray(list) || list.length > MAX_AX_RECORDS)
    fail(`${label}은(는) ${MAX_AX_RECORDS.toLocaleString("ko-KR")}건 이하의 목록이어야 합니다.`);
  const ids = new Set();
  for (const row of list) {
    if (!row || typeof row !== "object" || !requiredText(row.id, 100) || ids.has(row.id))
      fail(`${label}의 ID를 확인하세요.`);
    ids.add(row.id);
  }
}

/** Throws unless every AX project is valid. Executed money above the total is allowed (real overspend). */
export function validateAxProjects(list) {
  checkList(list, "AX 사업");
  for (const p of list) {
    if (!requiredText(p.title, 200)) fail("AX 사업명을 입력하세요(200자 이하).");
    if (!Object.hasOwn(AX_ZONES, p.zone)) fail("AX 사업의 권역을 선택하세요.");
    if (!Object.hasOwn(AX_STAGES, p.stage)) fail("AX 사업의 단계를 선택하세요.");
    if (!amount(p.budgetTotal) || !amount(p.budgetExecuted))
      fail("사업비와 집행액은 0 이상의 숫자(천원)로 입력하세요.");
    for (const [key, max] of [["manager", 100], ["partner", 200], ["nextMilestone", 500], ["risks", 4000], ["notes", 4000]])
      if (!text(p[key], max)) fail(`AX 사업 내용이 너무 깁니다(${key}).`);
    if (!(p.nextMilestoneDate === null || validDateKey(p.nextMilestoneDate)))
      fail("차기 마일스톤 날짜를 확인하세요.");
    if (!timestamp(p.updatedAt)) fail("AX 사업의 수정 시각을 확인하세요.");
  }
  return list;
}

/** Throws unless every snippet is valid. Snippets are text only; the app never runs them. */
export function validateAxSnippets(list) {
  checkList(list, "스니펫");
  for (const s of list) {
    if (!requiredText(s.title, 200)) fail("스니펫 제목을 입력하세요(200자 이하).");
    if (!Object.hasOwn(AX_SNIPPET_CATEGORIES, s.category)) fail("스니펫 분류를 선택하세요.");
    if (!Array.isArray(s.tags) || s.tags.length > 20 || s.tags.some((t) => !requiredText(t, 30)) || new Set(s.tags).size !== s.tags.length)
      fail("스니펫 태그는 30자 이하로 20개까지, 중복 없이 입력하세요.");
    if (!text(s.snippet, MAX_SNIPPET_LENGTH)) fail("스니펫 본문은 100,000자 이하여야 합니다.");
    if (!text(s.description, 2000)) fail("스니펫 설명은 2,000자 이하여야 합니다.");
    if (!(s.example === undefined || s.example === true)) fail("스니펫 예제 표시를 확인하세요.");
    if (!timestamp(s.updatedAt)) fail("스니펫의 수정 시각을 확인하세요.");
  }
  return list;
}

/**
 * Execution rate for display: null when there is no budget (no division by zero), and the
 * real figure above 100% when spending exceeds the total. Bars clamp; numbers do not.
 */
export function executionRate(project) {
  if (!project.budgetTotal) return null;
  return project.budgetExecuted / project.budgetTotal;
}
