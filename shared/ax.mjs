// AX Desk records (TASK-MODULES-01, docs/specs/modular-ax/implementation.md 5장).
// Optional top-level collections axProjects and axSnippets. Enum values are stable keys;
// screens show the labels. Money is in thousand won (천원). Pure: no DOM, Electron or network.
import { localDate, validDateKey } from "./dates.mjs";
import { visibleModules, withModules } from "./applets.mjs";

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

/** Calendar title of a project's next milestone: the project name, then the milestone text. */
export const milestoneTitle = (p) => (p.nextMilestone.trim() ? `${p.title} · ${p.nextMilestone.trim()}` : p.title);

/**
 * Calendar rows derived from axProjects (TASK-AXDESK-01): exactly one all-day row per
 * project whose nextMilestoneDate falls in the range. Never copied into events or tasks,
 * so editing or deleting the project changes the calendar and briefing at once. Hiding the
 * AX module only hides the menu entry; the milestones stay, like every other record.
 */
export function milestoneItems(projects = [], range = {}) {
  return projects
    .filter((p) => p.nextMilestoneDate
      && (!range.startDate || p.nextMilestoneDate >= range.startDate)
      && (!range.endDate || p.nextMilestoneDate <= range.endDate))
    .map((p) => {
      const [y, m, d] = p.nextMilestoneDate.split("-").map(Number);
      return {
        id: p.id,
        title: milestoneTitle(p),
        at: localDate(y, m - 1, d).toISOString(),
        key: `ax:${p.id}`,
        category: "AX",
        page: "ax",
        done: p.stage === "done",
        zone: p.zone,
        stage: p.stage,
      };
    });
}

// Built-in examples (TASK-AXDESK-02, spec 3장). Text only: the app never runs them and they
// call nothing. Fixed IDs tell them apart; `example: true` marks them on screen.
export const AX_EXAMPLE_SNIPPETS = [
  {
    id: "example-gee-sentinel2",
    title: "Sentinel-2 구름 제거 중앙값 합성(GEE)",
    category: "gee",
    tags: ["Sentinel-2", "구름 제거", "합성영상"],
    description:
      "관심 구역(geometry)과 기간을 바꿔 Google Earth Engine 코드 편집기에 붙여 넣어 쓰는 예제입니다. 이 앱에서는 실행되지 않습니다.",
    snippet: [
      "// 관심 구역: 코드 편집기에서 그린 geometry를 사용합니다.",
      "var start = '2026-05-01';",
      "var end = '2026-09-30';",
      "",
      "function maskClouds(image) {",
      "  var scl = image.select('SCL');",
      "  // 3: 구름 그림자, 8·9: 구름, 10: 권운",
      "  var clear = scl.neq(3).and(scl.neq(8)).and(scl.neq(9)).and(scl.neq(10));",
      "  return image.updateMask(clear).divide(10000);",
      "}",
      "",
      "var composite = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')",
      "  .filterBounds(geometry)",
      "  .filterDate(start, end)",
      "  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 40))",
      "  .map(maskClouds)",
      "  .median()",
      "  .clip(geometry);",
      "",
      "Map.centerObject(geometry, 12);",
      "Map.addLayer(composite, {bands: ['B4', 'B3', 'B2'], min: 0, max: 0.3}, '실제 색');",
      "Map.addLayer(composite.normalizedDifference(['B8', 'B4']), {min: 0, max: 0.8, palette: ['white', 'green']}, 'NDVI');",
    ].join("\n"),
    example: true,
  },
  {
    id: "example-dd-dms",
    title: "위경도 십진도(DD) ↔ 도분초(DMS) 변환(Python)",
    category: "python",
    tags: ["좌표", "DD", "DMS"],
    description:
      "같은 위치를 표기만 바꾸는 계산입니다(투영 좌표계 변환이 아님). 예: 38.119444 = 38°7′10″. 순찰 기록의 좌표 입력과 같은 규칙입니다.",
    snippet: [
      "def dd_to_dms(value: float) -> tuple[int, int, float]:",
      '    """38.119444 -> (38, 7, 10.0)"""',
      "    sign = -1 if value < 0 else 1",
      "    value = abs(value)",
      "    degrees = int(value)",
      "    minutes = int((value - degrees) * 60)",
      "    seconds = round((value - degrees - minutes / 60) * 3600, 2)",
      "    if seconds >= 60:",
      "        seconds, minutes = 0.0, minutes + 1",
      "    if minutes >= 60:",
      "        minutes, degrees = 0, degrees + 1",
      "    return sign * degrees, minutes, seconds",
      "",
      "",
      "def dms_to_dd(degrees: int, minutes: int, seconds: float) -> float:",
      '    """(38, 7, 10) -> 38.119444"""',
      "    sign = -1 if degrees < 0 else 1",
      "    return sign * (abs(degrees) + minutes / 60 + seconds / 3600)",
      "",
      "",
      "print(dd_to_dms(38.119444))   # (38, 7, 10.0)",
      "print(round(dms_to_dd(38, 7, 10), 6))   # 38.119444",
    ].join("\n"),
    example: true,
  },
  {
    id: "example-report-prompt",
    title: "AX 사업 보고서 초안 작성 프롬프트",
    category: "prompt",
    tags: ["보고서", "프롬프트"],
    description:
      "생성형 AI에 사업 자료를 줄 때 쓰는 문구 예제입니다. 기관 보안 지침에 맞는 도구에서만 쓰고, 개인정보·미공개 자료는 넣지 마세요.",
    snippet: [
      "너는 국립공원 업무 보고서 작성을 돕는 보조자다. 아래 [사업 자료]에 있는 사실만 사용한다.",
      "",
      "작성 규칙",
      "1. 절 구성: 사업개요 / 추진배경 / 추진실적 / 향후계획",
      "2. 자료에 없는 수치·성과·법령·일정은 만들지 말고 '[작성 필요]'로 남긴다.",
      "3. 금액은 천원 단위로 쓰고, 집행률은 자료의 사업비와 집행액으로만 계산한다.",
      "4. 문장은 개조식으로, 한 항목은 두 줄 이내로 쓴다.",
      "5. 마지막에 '확인이 필요한 사항' 목록을 붙인다.",
      "",
      "[사업 자료]",
      "- 사업명:",
      "- 권역·단계:",
      "- 사업비·집행액(천원):",
      "- 차기 마일스톤:",
      "- 위험·이슈:",
    ].join("\n"),
    example: true,
  },
];

/** True once the examples were offered and taken; deleting them never brings them back. */
export const examplesAdded = (data) => data?.modules?.customConfigs?.["ax-desk"]?.examplesAdded === true;

/**
 * Data with the three examples added (TASK-AXDESK-02). Only an explicit user action calls
 * this, so opening the screen never writes the file. Examples whose ID is already present
 * are skipped, and the "added" mark is kept in the AX module's own settings.
 */
export function withExampleSnippets(data, now = new Date().toISOString()) {
  const have = new Set((data.axSnippets ?? []).map((s) => s.id));
  const added = AX_EXAMPLE_SNIPPETS.filter((s) => !have.has(s.id)).map((s) => ({ ...s, tags: [...s.tags], updatedAt: now }));
  // A saved setting stays exactly as it is (order included); only the AX entry gains the mark.
  const modules = data.modules ? { ...data.modules } : withModules(data, visibleModules(data));
  const configs = modules.customConfigs ?? {};
  const current = configs["ax-desk"];
  // A value this version cannot read (e.g. from a newer app) is never overwritten (spec 3장).
  if (current !== undefined && (current === null || typeof current !== "object" || Array.isArray(current)))
    throw new Error("AX 모듈 설정을 이 버전에서 읽을 수 없어 예제를 넣지 않았습니다. 자료는 바꾸지 않았습니다.");
  modules.customConfigs = { ...configs, "ax-desk": { ...current, examplesAdded: true } };
  return { ...data, axSnippets: [...(data.axSnippets ?? []), ...added], modules };
}
