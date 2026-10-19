import { validDateKey } from "./dates.mjs";
export const officeCollections = [
  "organizations",
  "employees",
  "bases",
  "assignments",
];
export const workTypes = {
  work: "사무소 근무",
  off: "휴무",
  leave: "연가",
  trip: "출장",
  base: "거점근무",
};
export const dutyTypes = { none: "없음", day: "주간당직", night: "숙직" };
// Summary groups for work types (TASK-LABELS-01): one place for screens and briefing.
export const WORK_GROUPS = { working: ["work", "base", "trip"], off: ["off", "leave"] };
/** "working" | "off" | null for a work type (null when unknown or unregistered). */
export function workGroup(workType) {
  if (WORK_GROUPS.working.includes(workType)) return "working";
  if (WORK_GROUPS.off.includes(workType)) return "off";
  return null;
}
const check = (condition, message) => {
  if (!condition) throw new Error(message);
};
const text = (value, max = 120) =>
  typeof value === "string" && value.length <= max;
const required = (value, max = 120) =>
  text(value, max) && value.trim().length > 0;
/** Same rule as shared/dates.mjs (kept for existing imports). */
export const validDate = validDateKey;
export function validateOffice(data) {
  const sets = {};
  for (const key of officeCollections) {
    check(
      Array.isArray(data[key]) && data[key].length <= 10000,
      "사무소 자료는 종류별 10,000건 이하의 목록이어야 합니다.",
    );
    const ids = new Set(),
      codes = new Set();
    for (const row of data[key]) {
      check(
        row && required(row.id, 100) && !ids.has(row.id),
        "사무소 항목의 ID가 없거나 중복됩니다.",
      );
      ids.add(row.id);
      if (key !== "assignments") {
        check(required(row.name), "조직·직원·거점의 이름을 입력하세요.");
        check(
          required(row.code, 80) && !codes.has(row.code),
          "조직·직원·거점 코드는 종류별로 고유해야 합니다.",
        );
        codes.add(row.code);
      }
    }
    sets[key] = ids;
  }
  const parents = new Map();
  for (const org of data.organizations) {
    check(
      org.parentId === null ||
        (sets.organizations.has(org.parentId) && org.parentId !== org.id),
      "상위 조직을 확인하세요.",
    );
    parents.set(org.id, org.parentId);
  }
  // Iterative traversal avoids recursion overflow on an imported deep hierarchy.
  const done = new Set();
  for (const id of parents.keys()) {
    const path = new Set();
    let next = id;
    while (next !== null && !done.has(next)) {
      check(!path.has(next), "조직의 상위 관계에 순환 참조가 있습니다.");
      path.add(next);
      next = parents.get(next);
    }
    for (const visited of path) done.add(visited);
  }
  for (const employee of data.employees) {
    check(
      sets.organizations.has(employee.organizationId),
      "직원의 소속 조직이 없습니다.",
    );
    check(
      text(employee.position, 100) && typeof employee.active === "boolean",
      "직위 또는 직원 사용 상태를 확인하세요.",
    );
  }
  for (const base of data.bases)
    check(
      sets.organizations.has(base.organizationId),
      "거점의 소속 조직이 없습니다.",
    );
  const days = new Set();
  for (const assignment of data.assignments) {
    check(
      sets.employees.has(assignment.employeeId),
      "근무표에 연결된 직원이 없습니다.",
    );
    check(validDate(assignment.date), "실제로 존재하는 근무일을 입력하세요.");
    const key = assignment.employeeId + ":" + assignment.date;
    check(
      !days.has(key),
      "같은 직원의 같은 날짜에는 근무 기록 하나만 등록할 수 있습니다.",
    );
    days.add(key);
    check(
      Object.hasOwn(workTypes, assignment.workType) &&
        Object.hasOwn(dutyTypes, assignment.duty),
      "근무 구분과 당직 구분을 확인하세요.",
    );
    check(
      assignment.baseId === null || sets.bases.has(assignment.baseId),
      "연결된 근무 거점이 없습니다.",
    );
    check(
      assignment.workType !== "base" || assignment.baseId !== null,
      "거점근무에는 거점을 선택하세요.",
    );
    check(
      assignment.workType === "base" || assignment.baseId === null,
      "거점근무 이외에는 거점을 비워주세요.",
    );
    check(text(assignment.note, 2000), "근무 비고는 2,000자 이내여야 합니다.");
  }
  return data;
}
export function officeRows(data, date, organizationId = "") {
  check(validDate(date), "현황판 날짜를 확인하세요.");
  const assignments = new Map(
    data.assignments
      .filter((a) => a.date === date)
      .map((a) => [a.employeeId, a]),
  );
  const organizations = new Map(data.organizations.map((o) => [o.id, o]));
  const bases = new Map(data.bases.map((b) => [b.id, b]));
  return data.employees
    .filter(
      (e) =>
        (e.active || assignments.has(e.id)) &&
        (!organizationId || e.organizationId === organizationId),
    )
    .map((employee) => {
      const assignment = assignments.get(employee.id) ?? null;
      return {
        employee,
        organization: organizations.get(employee.organizationId),
        assignment,
        base: assignment?.baseId ? bases.get(assignment.baseId) : null,
      };
    })
    .sort(
      (a, b) =>
        (a.organization?.name ?? "").localeCompare(
          b.organization?.name ?? "",
          "ko",
        ) || a.employee.name.localeCompare(b.employee.name, "ko"),
    );
}
export function officeSummary(data, date, organizationId = "") {
  const rows = officeRows(data, date, organizationId);
  return {
    total: rows.length,
    registered: rows.filter((r) => r.assignment).length,
    unregistered: rows.filter((r) => !r.assignment).length,
    working: rows.filter((r) => workGroup(r.assignment?.workType) === "working").length,
    off: rows.filter((r) => workGroup(r.assignment?.workType) === "off").length,
    duty: rows.filter((r) => r.assignment && r.assignment.duty !== "none")
      .length,
  };
}
