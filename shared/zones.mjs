// 담당구역 번호 목록 (TASK-LOCATION-01). Optional top-level collection `zones`:
// { id, code, name, route, active }. `code` is what a patrol stores in `zone`; patrols keep
// free text, so a code missing from this list is never rejected. Pure: no DOM or Electron.
export const MAX_ZONES = 10000;
const text = (v, max) => typeof v === "string" && v.length <= max;

/** Throws unless every zone is valid: unique ids, unique trimmed codes, sizes and types. */
export function validateZones(list) {
  if (!Array.isArray(list) || list.length > MAX_ZONES)
    throw new Error(`담당구역 목록은 ${MAX_ZONES.toLocaleString("ko-KR")}건 이하여야 합니다.`);
  const ids = new Set();
  const codes = new Set();
  for (const z of list) {
    if (!z || typeof z !== "object" || !text(z.id, 100) || !z.id.trim() || ids.has(z.id))
      throw new Error("담당구역 목록의 ID를 확인하세요.");
    ids.add(z.id);
    if (!text(z.code, 50) || !z.code.trim() || z.code !== z.code.trim())
      throw new Error("담당구역 번호는 앞뒤 공백 없이 50자 이하로 입력하세요.");
    if (codes.has(z.code)) throw new Error(`담당구역 번호 '${z.code}'가 두 번 있습니다.`);
    codes.add(z.code);
    if (!text(z.name, 100)) throw new Error("담당구역 이름은 100자 이하로 입력하세요.");
    if (!text(z.route, 500)) throw new Error("대표 순찰 구간은 500자 이하로 입력하세요.");
    if (typeof z.active !== "boolean") throw new Error("담당구역 사용 여부를 확인하세요.");
  }
  return list;
}

/** Zones offered in the patrol editor: active ones, ordered by code (natural order, 2-10 after 2-9). */
export function zoneSuggestions(data) {
  return (data.zones ?? [])
    .filter((z) => z.active)
    .sort((a, b) => a.code.localeCompare(b.code, "ko", { numeric: true }));
}

/** The listed zone with this code (trimmed), if any. */
export const findZone = (data, code) => {
  const key = (code ?? "").trim();
  return key ? (data.zones ?? []).find((z) => z.code === key) : undefined;
};

/**
 * Route suggestions: the chosen zone's route first, then routes of recent patrols
 * (latest first by time), without duplicates, at most `limit`.
 */
export function routeSuggestions(data, zoneCode, limit = 10) {
  const out = [];
  const add = (route) => {
    const value = (route ?? "").trim();
    if (value && !out.includes(value) && out.length < limit) out.push(value);
  };
  add(findZone(data, zoneCode)?.route);
  [...(data.patrols ?? [])].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).forEach((p) => add(p.route));
  return out;
}
