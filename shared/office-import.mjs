import { normalize } from "./model.mjs";
import { validDate, workTypes, dutyTypes } from "./office.mjs";
export const importColumns = {
  organizations: ["code", "name", "parentCode"],
  employees: ["code", "name", "organizationCode", "position", "active"],
  bases: ["code", "name", "organizationCode"],
  assignments: ["employeeCode", "date", "workType", "duty", "baseCode", "note"],
};
export function parseCsv(source) {
  if (
    typeof source !== "string" ||
    new TextEncoder().encode(source).length > 2 * 1024 * 1024
  )
    throw new Error("UTF-8 CSV는 2MB 이하로 반입하세요.");
  source = source.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [],
    field = "",
    quoted = false,
    closed = false;
  function cell() {
    row.push(field);
    field = "";
    closed = false;
  }
  function record() {
    cell();
    if (row.some((v) => v.trim())) rows.push(row);
    row = [];
    if (rows.length > 10001)
      throw new Error("CSV는 머리글 외 10,000행까지 반입할 수 있습니다.");
  }
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index++;
        } else {
          quoted = false;
          closed = true;
        }
      } else field += char;
      continue;
    }
    if (char === '"') {
      if (field || closed) throw new Error("CSV 따옴표 위치를 확인하세요.");
      quoted = true;
    } else if (char === ",") cell();
    else if (char === "\r" || char === "\n") {
      record();
      if (char === "\r" && source[index + 1] === "\n") index++;
    } else {
      if (closed)
        throw new Error("CSV 닫는 따옴표 뒤에는 쉼표나 줄바꿈이 필요합니다.");
      field += char;
    }
  }
  if (quoted) throw new Error("CSV 따옴표가 닫히지 않았습니다.");
  if (field || row.length || closed) record();
  return rows;
}
function mapped(value, options, label) {
  if (Object.hasOwn(options, value)) return value;
  const match = Object.entries(options).find(([, name]) => name === value);
  if (!match) throw new Error(`${label} 값 '${value}'을 확인하세요.`);
  return match[0];
}
export function previewOfficeImport(
  data,
  kind,
  source,
  createId = () => crypto.randomUUID(),
) {
  const columns = importColumns[kind];
  if (!columns) throw new Error("반입 종류를 확인하세요.");
  const [header, ...records] = parseCsv(source);
  if (
    !header ||
    header.length !== columns.length ||
    columns.some((c) => !header.map((v) => v.trim()).includes(c))
  )
    throw new Error(`머리글은 ${columns.join(",")} 을 사용하세요.`);
  if (!records.length) throw new Error("반입할 자료 행이 없습니다.");
  const index = Object.fromEntries(header.map((h, i) => [h.trim(), i]));
  const next = { ...data, [kind]: [...data[kind]] };
  const seen = new Set(),
    changes = [];
  const byCode = (key, code) => next[key].find((row) => row.code === code);
  function reference(key, code, label) {
    const row = byCode(key, code);
    if (!row)
      throw new Error(
        `${label} 코드 '${code}'이 없습니다. 기준 정보를 먼저 반입하세요.`,
      );
    return row.id;
  }
  // Organization IDs are allocated before parent resolution, allowing child-first files.
  const orgIds = new Map(data.organizations.map((row) => [row.code, row.id]));
  if (kind === "organizations")
    for (const record of records) {
      const code = (record[index.code] ?? "").trim();
      if (!orgIds.has(code)) orgIds.set(code, createId());
    }
  for (let line = 0; line < records.length; line++) {
    try {
      const record = records[line];
      if (record.length !== columns.length)
        throw new Error("열 수가 머리글과 다릅니다.");
      const value = Object.fromEntries(
        columns.map((c) => [c, record[index[c]].trim()]),
      );
      let item, key;
      if (kind === "organizations") {
        key = value.code;
        item = {
          id: orgIds.get(key),
          code: key,
          name: value.name,
          parentId: value.parentCode
            ? (orgIds.get(value.parentCode) ??
              reference("organizations", value.parentCode, "상위 조직"))
            : null,
        };
      } else if (kind === "employees") {
        key = value.code;
        if (!["true", "false"].includes(value.active))
          throw new Error("active는 true 또는 false로 입력하세요.");
        item = {
          id: byCode(kind, key)?.id ?? createId(),
          code: key,
          name: value.name,
          organizationId: reference(
            "organizations",
            value.organizationCode,
            "소속 조직",
          ),
          position: value.position,
          active: value.active === "true",
        };
      } else if (kind === "bases") {
        key = value.code;
        item = {
          id: byCode(kind, key)?.id ?? createId(),
          code: key,
          name: value.name,
          organizationId: reference(
            "organizations",
            value.organizationCode,
            "소속 조직",
          ),
        };
      } else {
        const employeeId = reference("employees", value.employeeCode, "직원");
        if (!validDate(value.date))
          throw new Error("근무일은 실제 존재하는 YYYY-MM-DD 날짜여야 합니다.");
        key = employeeId + ":" + value.date;
        const existing = next.assignments.find(
          (a) => a.employeeId === employeeId && a.date === value.date,
        );
        const workType = mapped(value.workType, workTypes, "근무 구분");
        const duty = mapped(value.duty, dutyTypes, "당직 구분");
        item = {
          id: existing?.id ?? createId(),
          employeeId,
          date: value.date,
          workType,
          duty,
          baseId: value.baseCode
            ? reference("bases", value.baseCode, "거점")
            : null,
          note: value.note,
        };
      }
      if (!key || seen.has(key))
        throw new Error(
          "파일 안의 코드 또는 직원/날짜가 비어 있거나 중복됩니다.",
        );
      seen.add(key);
      const position = next[kind].findIndex((row) => row.id === item.id);
      const existing = next[kind][position];
      const action =
        position < 0
          ? "추가"
          : Object.keys(item).every((k) => existing[k] === item[k])
            ? "유지"
            : "수정";
      if (position < 0) next[kind].push(item);
      else next[kind][position] = { ...existing, ...item };
      changes.push({
        line: line + 2,
        label:
          kind === "assignments"
            ? `${value.employeeCode} · ${value.date}`
            : `${value.code} · ${value.name}`,
        action,
      });
    } catch (error) {
      throw new Error(`${line + 2}행: ${error.message}`);
    }
  }
  return {
    data: normalize(next),
    changes,
    added: changes.filter((r) => r.action === "추가").length,
    updated: changes.filter((r) => r.action === "수정").length,
    unchanged: changes.filter((r) => r.action === "유지").length,
  };
}
