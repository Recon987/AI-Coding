const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path");
const { empty, normalize } = require("../shared/model.mjs");
const {
  officeRows,
  officeSummary,
  validDate,
} = require("../shared/office.mjs");
const org = { id: "o1", code: "PARK", name: "시험 사무소", parentId: null };
const employee = {
  id: "e1",
  code: "001",
  name: "시험 직원",
  organizationId: "o1",
  position: "담당",
  active: true,
};
const base = {
  id: "b1",
  code: "B01",
  name: "탐방지원센터",
  organizationId: "o1",
};
const assignment = {
  id: "a1",
  employeeId: "e1",
  date: "2026-10-15",
  workType: "base",
  duty: "night",
  baseId: "b1",
  note: "교대 인계",
};
const fixture = () => ({
  ...empty(),
  organizations: [org],
  employees: [
    employee,
    { ...employee, id: "e2", code: "002", name: "미등록 직원" },
  ],
  bases: [base],
  assignments: [assignment],
});
test("v2 원본은 바이트 그대로 자동 보관하고 v3로 반복 안전하게 전환한다", () => {
  const { migrateFile, read } = require("../desktop/store.cjs");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "office-v3-"));
  try {
    const file = path.join(dir, "workdesk.json");
    const legacy = {
      version: 2,
      notes: [{ id: "n", title: "기존 메모", body: "보존" }],
      calls: [],
      events: [],
      folders: [],
      patrols: [],
      tasks: [],
    };
    const raw = JSON.stringify(legacy);
    fs.writeFileSync(file, raw);
    migrateFile(file);
    const migrated = read(file);
    assert.equal(migrated.version, 3);
    assert.deepEqual(migrated.notes, legacy.notes);
    assert.deepEqual(migrated.employees, []);
    assert.equal(fs.readFileSync(file + ".v2-backup.json", "utf8"), raw);
    migrateFile(file);
    assert.equal(fs.readFileSync(file + ".v2-backup.json", "utf8"), raw);
    assert.equal(legacy.version, 2);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test("근무현황은 미등록을 근무로 추정하지 않고 거점근무와 숙직을 함께 집계한다", () => {
  const data = normalize(fixture());
  const before = JSON.stringify(data);
  assert.equal(officeRows(data, "2026-10-15").length, 2);
  assert.deepEqual(officeSummary(data, "2026-10-15"), {
    total: 2,
    registered: 1,
    unregistered: 1,
    working: 1,
    off: 0,
    duty: 1,
  });
  assert.equal(
    officeRows(data, "2026-10-15").find((r) => r.employee.id === "e1").base
      .name,
    base.name,
  );
  assert.equal(officeSummary(data, "2026-10-16").unregistered, 2);
  assert.equal(officeRows(data, "2026-10-15", "unknown").length, 0);
  assert.equal(JSON.stringify(data), before);
});
test("코드 중복·조직 순환·깨진 소속·근무 중복·날짜·거점 오류를 저장 전에 거부한다", () => {
  const data = fixture();
  assert.deepEqual(normalize(JSON.parse(JSON.stringify(data))), data);
  for (const change of [
    { employees: [employee, { ...employee, id: "e9" }] },
    {
      organizations: [
        { ...org, parentId: "o2" },
        { id: "o2", code: "DEPT", name: "부서", parentId: "o1" },
      ],
    },
    { employees: [{ ...employee, organizationId: "missing" }] },
    { assignments: [assignment, { ...assignment, id: "a2" }] },
    { assignments: [{ ...assignment, date: "2026-02-30" }] },
    { assignments: [{ ...assignment, employeeId: "missing" }] },
    { assignments: [{ ...assignment, baseId: null }] },
    { assignments: [{ ...assignment, baseId: "missing" }] },
    { assignments: [{ ...assignment, duty: "other" }] },
    { assignments: [{ ...assignment, workType: "off" }] },
    { organizations: Array(10001).fill(org) },
  ])
    assert.throws(() => normalize({ ...data, ...change }));
  assert.equal(validDate("2028-02-29"), true);
  assert.equal(validDate("2026-02-29"), false);
  assert.throws(() => officeRows(data, "bad"));
});
test("비활성 직원의 과거 근무는 보존하고 새 날짜의 현황 대상에서는 제외한다", () => {
  const data = fixture();
  data.employees[0] = { ...employee, active: false };
  assert.equal(officeRows(data, "2026-10-15").length, 2);
  assert.equal(officeRows(data, "2026-10-16").length, 1);
});

const {
  parseCsv,
  previewOfficeImport,
} = require("../shared/office-import.mjs");
test("CSV는 BOM·따옴표·줄바꿈을 읽고, 소속 참조를 검증한 전체 반입 미리보기를 만든다", () => {
  assert.deepEqual(
    parseCsv('\ufeffcode,name\r\n001,"가,나"\r\n002,"다""라\n마"'),
    [
      ["code", "name"],
      ["001", "가,나"],
      ["002", '다"라\n마'],
    ],
  );
  assert.throws(() => parseCsv('code,name\n001,"미종료'));
  const data = fixture(),
    before = JSON.stringify(data);
  const p = previewOfficeImport(
    data,
    "employees",
    "code,name,organizationCode,position,active\n001,수정 이름,PARK,주무관,true\n003,추가 직원,PARK,담당,true",
  );
  assert.equal(p.updated, 1);
  assert.equal(p.added, 1);
  assert.equal(p.data.employees.find((e) => e.code === "001").id, "e1");
  assert.equal(p.data.assignments[0].employeeId, "e1");
  assert.equal(JSON.stringify(data), before);
  const updated = previewOfficeImport(
    data,
    "assignments",
    "employeeCode,date,workType,duty,baseCode,note\n001,2026-10-15,거점근무,숙직,B01,인계 확인",
  );
  assert.equal(updated.updated, 1);
  assert.equal(updated.data.assignments[0].id, "a1");
  const orgs = previewOfficeImport(
    empty(),
    "organizations",
    "code,name,parentCode\nD,하위,P\nP,상위,",
  );
  assert.equal(
    orgs.data.organizations[0].parentId,
    orgs.data.organizations[1].id,
  );
});
test("CSV 미리보기에서 중복·깨진 참조·허용하지 않는 상태·잘못된 열을 거부하며 원본을 보존한다", () => {
  const data = fixture(),
    before = JSON.stringify(data);
  for (const source of [
    "code,name,organizationCode,position,active\n004,직원,missing,담당,true",
    "code,name,organizationCode,position,active\n004,직원,PARK,담당,yes",
    "code,name,organizationCode,position,active\n004,직원,PARK,담당,true\n004,다른직원,PARK,담당,true",
    "code,name\n004,직원",
  ])
    assert.throws(() => previewOfficeImport(data, "employees", source));
  assert.throws(() =>
    previewOfficeImport(
      data,
      "assignments",
      "employeeCode,date,workType,duty,baseCode,note\n001,2026-10-15,base,night,,비고",
    ),
  );
  assert.equal(JSON.stringify(data), before);
});
