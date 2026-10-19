// Built-in tool registry (TASK-MODULES-01, docs/specs/modular-ax/implementation.md 4장).
// Only tools packaged with the app exist here; nothing is loaded from files or the network.
// The saved `modules` setting only chooses which of these show in the menu.
// Pure: no DOM, Electron or network.

/** Always shown; cannot be turned off. `pages` are the existing Page IDs each one covers. */
export const CORE_APPLETS = [
  { id: "briefing", name: "업무 브리핑", icon: "briefing", category: "core", pages: ["briefing"] },
  { id: "calendar", name: "월간 일정", icon: "calendar", category: "core", pages: ["calendar"] },
  // navName: shorter sidebar text; the full name stays the accessible name.
  { id: "tasks", name: "인수인계·제출 기한", navName: "인수인계·기한", icon: "handover", category: "core", pages: ["handover", "submission"] },
  { id: "memos", name: "업무·전화 메모", navName: "메모·전화", icon: "notes", category: "core", pages: ["notes", "calls"] },
];
/** Job modules the user can show or hide. Hiding never deletes data. */
export const MODULE_APPLETS = [
  {
    id: "patrols",
    name: "현장 순찰",
    icon: "patrol",
    category: "field",
    description: "순찰 기록·단속 집계·탐방로 통제",
    defaultEnabled: true,
    pages: ["patrol", "controls"],
  },
  {
    id: "office",
    name: "사무소 현황",
    icon: "office",
    category: "admin",
    description: "조직·직원·거점과 일·주간 근무표",
    defaultEnabled: false,
    pages: ["office"],
  },
  {
    id: "ax-desk",
    name: "AX 사업 관리",
    // Icon name; the SVG is added with the screen (TASK-MODULES-02).
    icon: "ax",
    category: "planning",
    description: "권역별 AX 사업·GIS/AI 스니펫·보고서 초안(본사 AX추진팀)",
    defaultEnabled: true,
    pages: ["ax", "ax-snippets"],
  },
];
export const APPLET_CATEGORIES = { core: "공통", field: "현장", planning: "기획", admin: "행정" };
const MODULE_IDS = new Set(MODULE_APPLETS.map((m) => m.id));

/** True when the data already holds office records, so the office module stays visible. */
const usesOffice = (data) =>
  ["organizations", "employees", "assignments"].some((key) => Array.isArray(data?.[key]) && data[key].length > 0);

/**
 * The module IDs to show, in order. Without a saved `modules` setting the defaults are
 * computed in memory (never written just by opening): patrols and ax-desk, plus office for
 * installs that already have office records. Saved IDs this version does not know are kept
 * in the file but not shown.
 */
export function visibleModules(data) {
  const saved = data?.modules;
  if (!saved) {
    const on = MODULE_APPLETS.filter((m) => m.defaultEnabled || (m.id === "office" && usesOffice(data)));
    return on.map((m) => m.id);
  }
  const enabled = new Set(saved.enabledModuleIds.filter((id) => MODULE_IDS.has(id)));
  const ordered = saved.moduleOrder.filter((id) => enabled.has(id));
  const rest = MODULE_APPLETS.map((m) => m.id).filter((id) => enabled.has(id) && !ordered.includes(id));
  return [...new Set([...ordered, ...rest])];
}

/** The menu order of every known module (shown or not), for the module drawer. */
export function moduleOrder(data) {
  const known = MODULE_APPLETS.map((m) => m.id);
  const saved = (data?.modules?.moduleOrder ?? []).filter((id) => MODULE_IDS.has(id));
  return [...new Set([...saved, ...known])];
}

/**
 * A new `modules` value with the given known IDs shown in the given order. IDs and settings
 * this version does not know are carried over unchanged, so a newer version's choices survive.
 */
export function withModules(data, shownInOrder) {
  const current = data?.modules ?? { enabledModuleIds: [], moduleOrder: [], customConfigs: {} };
  const unknownEnabled = current.enabledModuleIds.filter((id) => !MODULE_IDS.has(id));
  const unknownOrder = current.moduleOrder.filter((id) => !MODULE_IDS.has(id));
  const order = [...shownInOrder, ...moduleOrder(data).filter((id) => !shownInOrder.includes(id))];
  return {
    ...current,
    enabledModuleIds: [...shownInOrder.filter((id) => MODULE_IDS.has(id)), ...unknownEnabled],
    moduleOrder: [...order, ...unknownOrder],
    customConfigs: current.customConfigs ?? {},
  };
}

const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const RESERVED = new Set(["__proto__", "constructor", "prototype"]);
const MAX_IDS = 100;
const MAX_CONFIG_BYTES = 64 * 1024;
const utf8 = new TextEncoder();
/** Size of the JSON text in UTF-8 bytes, as written to disk (한글 is 3 bytes per character). */
export const jsonBytes = (value) => utf8.encode(JSON.stringify(value)).length;
const MAX_CONFIG_DEPTH = 6;
const fail = (message) => {
  throw new Error(message);
};
function checkIds(list, label) {
  if (!Array.isArray(list) || list.length > MAX_IDS) fail(`${label}은(는) ${MAX_IDS}개 이하의 목록이어야 합니다.`);
  const seen = new Set();
  for (const id of list) {
    if (typeof id !== "string" || !ID.test(id)) fail(`${label}의 모듈 ID 형식을 확인하세요.`);
    if (seen.has(id)) fail(`${label}에 같은 모듈 ID가 두 번 있습니다: ${id}`);
    seen.add(id);
  }
}
function checkJson(value, depth) {
  if (depth > MAX_CONFIG_DEPTH) fail("모듈 설정이 너무 깊습니다.");
  if (value === null || ["string", "boolean"].includes(typeof value)) return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("모듈 설정에 올바르지 않은 숫자가 있습니다.");
    return;
  }
  if (Array.isArray(value)) return value.forEach((item) => checkJson(item, depth + 1));
  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    for (const [key, item] of Object.entries(value)) {
      if (RESERVED.has(key) || key.length > 64) fail("모듈 설정의 항목 이름을 확인하세요.");
      checkJson(item, depth + 1);
    }
    return;
  }
  fail("모듈 설정에는 JSON 값만 저장할 수 있습니다.");
}
/**
 * Throws unless `modules` is a valid setting. Unknown module IDs, keys and per-module
 * settings are allowed (and kept) so a newer version's choices are not lost.
 */
export function validateModules(modules) {
  if (!modules || typeof modules !== "object" || Array.isArray(modules)) fail("모듈 설정 형식을 확인하세요.");
  const keys = Object.keys(modules);
  if (keys.length > 20 || keys.some((key) => RESERVED.has(key) || key.length > 64))
    fail("모듈 설정의 항목 이름을 확인하세요.");
  checkIds(modules.enabledModuleIds, "켠 모듈 목록");
  checkIds(modules.moduleOrder, "모듈 순서");
  const configs = modules.customConfigs ?? {};
  if (typeof configs !== "object" || configs === null || Array.isArray(configs)) fail("모듈 설정 형식을 확인하세요.");
  for (const id of Object.keys(configs)) if (!ID.test(id)) fail("모듈 설정의 모듈 ID 형식을 확인하세요.");
  checkJson(configs, 0);
  // Bytes, not characters (MOD-01): 30,000 한글 characters are about 90KB on disk.
  if (jsonBytes(configs) > MAX_CONFIG_BYTES) fail("모듈 설정은 64KB 이하여야 합니다.");
  for (const [key, value] of Object.entries(modules))
    if (!["enabledModuleIds", "moduleOrder", "customConfigs"].includes(key)) checkJson(value, 1);
  return modules;
}
