// CSV 반입 for 담당구역 목록 (TASK-LOCATION-01), same parser and rules as the office import:
// same code updates, new code adds, rows missing from the file stay. Any bad row rejects
// the whole file before anything is written. Pure.
import { normalize } from "./model.mjs";
import { parseCsv } from "./office-import.mjs";

export const ZONE_COLUMNS = ["code", "name", "route", "active"];

export function previewZoneImport(data, source, createId = () => crypto.randomUUID()) {
  const [header, ...records] = parseCsv(source);
  if (!header || header.length !== ZONE_COLUMNS.length || ZONE_COLUMNS.some((c) => !header.map((v) => v.trim()).includes(c)))
    throw new Error(`머리글은 ${ZONE_COLUMNS.join(",")} 을 사용하세요.`);
  if (!records.length) throw new Error("반입할 자료 행이 없습니다.");
  const index = Object.fromEntries(header.map((h, i) => [h.trim(), i]));
  const zones = [...(data.zones ?? [])];
  const seen = new Set();
  const changes = [];
  for (let line = 0; line < records.length; line++) {
    try {
      const record = records[line];
      if (record.length !== ZONE_COLUMNS.length) throw new Error("열 수가 머리글과 다릅니다.");
      const value = Object.fromEntries(ZONE_COLUMNS.map((c) => [c, record[index[c]].trim()]));
      if (!value.code) throw new Error("담당구역 번호(code)가 비어 있습니다.");
      if (seen.has(value.code)) throw new Error(`파일 안에 번호 '${value.code}'가 두 번 있습니다.`);
      seen.add(value.code);
      if (!["", "true", "false"].includes(value.active)) throw new Error("active는 true, false 또는 빈칸으로 입력하세요.");
      const position = zones.findIndex((z) => z.code === value.code);
      const existing = zones[position];
      const item = {
        id: existing?.id ?? createId(),
        code: value.code,
        name: value.name,
        route: value.route,
        active: value.active !== "false",
      };
      const action =
        position < 0 ? "추가" : ["name", "route", "active"].every((k) => existing[k] === item[k]) ? "유지" : "수정";
      if (position < 0) zones.push(item);
      else zones[position] = { ...existing, ...item };
      changes.push({ line: line + 2, label: `${value.code}${value.name ? ` · ${value.name}` : ""}`, action });
    } catch (error) {
      throw new Error(`${line + 2}행: ${error.message}`);
    }
  }
  return {
    data: normalize({ ...data, zones }),
    changes,
    added: changes.filter((r) => r.action === "추가").length,
    updated: changes.filter((r) => r.action === "수정").length,
    unchanged: changes.filter((r) => r.action === "유지").length,
  };
}
