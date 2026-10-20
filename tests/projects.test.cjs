// TASK-HUB-B2A-01: 일반 사업·근거 보관함 자료 모델 — projects/references, one project ID
// space with axProjects, optional links on tasks/axProjects, source and evidence display.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const store = require("../desktop/store.cjs");
const seal = require("../desktop/seal.cjs");
const keystore = require("../desktop/keystore.cjs");
const { empty, normalize, READER_VERSION } = require("../shared/model.mjs");
const P = require("../shared/projects.mjs");
store.retry.wait = () => {};

const NOW = "2026-10-20T09:00:00.000Z";
const project = (id, over = {}) => ({
  id, title: `가상 사업 ${id}`, field: "facility", stage: "progress", manager: "가상 담당", nextMilestone: "",
  nextMilestoneDate: null, risks: "", notes: "", referenceIds: [], updatedAt: NOW, ...over,
});
const axProject = (id, over = {}) => ({
  id, title: `가상 AX ${id}`, zone: "west", stage: "execution", budgetTotal: 1000, budgetExecuted: 250, manager: "가상 AX 담당",
  partner: "가상 협력사", nextMilestone: "중간 점검", nextMilestoneDate: "2026-11-02", risks: "", notes: "", updatedAt: NOW, ...over,
});
const reference = (id, over = {}) => ({
  id, title: `가상 근거 ${id}`, kind: "docNo", targetId: null, path: null, docNo: "가상-2026-001", note: "", addedAt: NOW, ...over,
});
const task = (id, over = {}) => ({
  id, title: `가상 인계 ${id}`, body: "", kind: "handover", at: "2026-10-21T09:00:00+09:00", assignee: "", destination: "",
  priority: "normal", remindMinutes: 0, patrolId: null, done: false, completedAt: null, ...over,
});
async function sandbox(run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "workdesk-projects-"));
  try {
    return await run(dir, path.join(dir, "workdesk.json"));
  } finally {
    store.setSealer(null);
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("projects·references는 선택 항목: 없는 기존 자료도 열리고 판독 수준은 그대로", () => {
  const { projects, references, ...old } = empty();
  const read = normalize(old);
  assert.deepEqual([read.projects, read.references], [[], []]);
  assert.equal(read.minReader, undefined, "새 컬렉션만으로 minReader를 붙이지 않음");
  assert.equal(READER_VERSION, 3, "3은 봉투 전용(SECURITY-02); 이 카드는 올리지 않음");
  const data = { ...empty(), projects: [project("p1")], references: [reference("r1")] };
  assert.deepEqual(normalize(data).projects, data.projects);
  assert.equal(normalize(data).minReader, undefined);
});

test("검증: 분야·단계·길이·근거 목록·종류별 필수 값·경로는 저장 전에 거부", () => {
  for (const [bad, message] of [
    [{ projects: [project("p1", { field: "ax" })] }, /분야/],
    [{ projects: [project("p1", { stage: "execution" })] }, /단계/],
    [{ projects: [project("p1", { title: " " })] }, /사업명/],
    [{ projects: [project("p1", { referenceIds: ["r1", "r1"] })] }, /근거 자료 목록/],
    [{ projects: [project("p1", { referenceIds: Array.from({ length: 51 }, (_, i) => `r${i}`) })] }, /50개/],
    [{ projects: [project("p1", { nextMilestoneDate: "2026-13-01" })] }, /마일스톤/],
    [{ projects: [project("p1"), project("p1")] }, /ID/],
    [{ references: [reference("r1", { kind: "folder", targetId: null })] }, /필요한 값/],
    [{ references: [reference("r1", { kind: "file", path: null })] }, /필요한 값/],
    [{ references: [reference("r1", { kind: "file", path: "상대경로/파일.hwp" })] }, /절대 경로/],
    [{ references: [reference("r1", { kind: "exe" })] }, /종류/],
    [{ tasks: [task("t1", { projectId: "" })] }, /연결된 사업/],
    [{ tasks: [task("t1", { referenceIds: "r1" })] }, /근거 자료 목록/],
    [{ axProjects: [axProject("a1", { referenceIds: [1] })] }, /AX 사업의 근거/],
  ])
    assert.throws(() => normalize({ ...empty(), ...bad }), message, JSON.stringify(bad).slice(0, 80));
  for (const pathText of ["C:\\가상\\근거.hwp", "\\\\서버\\공유\\근거.pdf", "/home/가상/근거.pdf"])
    assert.doesNotThrow(() => normalize({ ...empty(), references: [reference("r1", { kind: "file", path: pathText, docNo: null })] }));
});

test("단일 사업 ID 공간: 일반·AX ID가 겹치면 거부, 합집합 하나로 연결을 본다", () => {
  assert.throws(() => normalize({ ...empty(), projects: [project("same")], axProjects: [axProject("same")] }), /ID가 겹칩니다/);
  const data = normalize({ ...empty(), projects: [project("p1")], axProjects: [axProject("a1")] });
  assert.deepEqual([...P.projectIdSet(data)].sort(), ["a1", "p1"]);
});

test("끊긴 참조는 거부하지 않는다: 없는 사업·근거를 가리키는 인계·AX 사업도 열리고 그대로 저장", () =>
  sandbox((dir, file) => {
    const data = {
      ...empty(),
      tasks: [task("t1", { projectId: "지워진 사업", referenceIds: ["지워진 근거"] })],
      axProjects: [axProject("a1", { referenceIds: ["지워진 근거"] })],
    };
    store.write(file, data);
    const read = store.read(file);
    assert.deepEqual([read.tasks[0].projectId, read.tasks[0].referenceIds, read.axProjects[0].referenceIds], ["지워진 사업", ["지워진 근거"], ["지워진 근거"]]);
    assert.deepEqual(P.projectRef(read, "지워진 사업"), { exists: false, id: "지워진 사업", label: "사업 없음(삭제됨)" });
    assert.equal(P.projectRef(read, null), null);
    assert.deepEqual(P.referenceView(read, "지워진 근거"), { exists: false, id: "지워진 근거", label: "삭제된 자료" });
  }));

test("구판이 의존하는 보존 성질: 모르는 레코드 필드와 최상위 항목은 정규화·저장 뒤에도 남는다", () =>
  sandbox((dir, file) => {
    // Older readers (reader 2, main ea3105e) run the same pass-through: they keep the new
    // fields and collections. Checked once against origin/main's model (claude-hub-schema-plan 1.1).
    const data = {
      ...empty(),
      tasks: [task("t1", { projectId: "p1", futureField: { a: 1 } })],
      notes: [{ id: "n1", title: "가상 메모", body: "", futureField: "유지" }],
      futureCollection: [{ id: "w1", title: "가상 작업", source: { kind: "call", id: "c1", title: "가상 전화" } }],
    };
    store.write(file, data);
    const read = store.read(file);
    assert.deepEqual(read.tasks[0].futureField, { a: 1 });
    assert.equal(read.notes[0].futureField, "유지");
    assert.deepEqual(read.futureCollection, data.futureCollection);
  }));

test("ProjectView: 일반·AX를 한 형태로, AX 단계는 일반 단계로 표시만, 모듈을 끄면 확장 필드 없음", () => {
  const data = normalize({ ...empty(), projects: [project("p1", { field: "resource" })], axProjects: [axProject("a1"), axProject("a2", { stage: "contract" })] });
  const views = P.listProjects(data);
  assert.deepEqual(views.map((v) => [v.id, v.store, v.field, v.stage]), [
    ["p1", "projects", "resource", "progress"],
    ["a1", "axProjects", "ax", "progress"],
    ["a2", "axProjects", "ax", "progress"],
  ]);
  assert.deepEqual(views[1].ext.ax, { zone: "west", axStage: "execution", axStageLabel: "수행/실증", budgetTotal: 1000, budgetExecuted: 250, partner: "가상 협력사" });
  assert.deepEqual(views[1].referenceIds, [], "필드가 없는 기존 AX 사업");
  assert.equal(views[0].ext, undefined);
  const hidden = P.listProjects(data, { axEnabled: false });
  assert.equal(hidden.length, 3, "AX 모듈을 꺼도 사업은 그대로");
  assert.ok(hidden.every((v) => v.ext === undefined));
  // The original AX record is untouched by the view.
  assert.equal(data.axProjects[0].stage, "execution");
  assert.deepEqual(P.PROJECT_FIELDS, { facility: "시설", resource: "자원보전", ax: "AX", admin: "행정", general: "일반" });
});

test("출처 표시: 원본이 있으면 현재 제목, 지워졌으면 사본 제목으로 '삭제된 …'", () => {
  const data = normalize({
    ...empty(),
    calls: [{ id: "c1", title: "가상 전화 — 고친 제목", body: "", phone: "", done: false }],
    notes: [{ id: "n1", title: "가상 메모", body: "" }],
  });
  assert.deepEqual(P.sourceView(data, { kind: "call", id: "c1", title: "가상 전화 — 처음 제목" }), {
    live: true, label: "출처: 전화메모 · 가상 전화 — 고친 제목", page: "calls", id: "c1",
  });
  assert.deepEqual(P.sourceView(data, { kind: "call", id: "c9", title: "가상 지운 전화" }), {
    live: false, label: "출처: 삭제된 전화메모 — 가상 지운 전화", page: null, id: "c9",
  });
  assert.equal(P.sourceView(data, { kind: "note", id: "n9", title: "가상 지운 메모" }).label, "출처: 삭제된 메모 — 가상 지운 메모");
  assert.equal(P.sourceView(data, { kind: "patrol", id: "p9", title: "가상 순찰" }).label, "출처: 삭제된 순찰 기록 — 가상 순찰");
  assert.equal(P.sourceView(data, null), null);
  assert.equal(P.validateSource(null), null);
  for (const bad of [{ kind: "unknown", id: "m1", title: "" }, { kind: "call", id: "", title: "" }, { kind: "call", id: "c1", title: "가".repeat(501) }, "c1"])
    assert.throws(() => P.validateSource(bad), /출처/);
});

test("근거 표시: 폴더·스니펫은 현재 대상을 따르고, 대상이 지워지면 '대상 없음'", () => {
  const data = normalize({
    ...empty(),
    folders: [{ id: "f1", title: "가상 폴더", path: "C:\\가상\\자료" }],
    references: [
      reference("r1", { kind: "folder", targetId: "f1", docNo: null }),
      reference("r2", { kind: "snippet", targetId: "s9", docNo: null }),
      reference("r3", { kind: "file", path: "D:\\가상\\보고.hwp", docNo: null }),
      reference("r4"),
    ],
  });
  assert.deepEqual(P.referenceView(data, "r1"), {
    exists: true, id: "r1", kind: "folder", kindLabel: "폴더", label: "가상 근거 r1", targetMissing: false, path: "C:\\가상\\자료", docNo: null,
  });
  assert.equal(P.referenceView(data, "r2").label, "가상 근거 r2 (대상 없음)");
  assert.equal(P.referenceView(data, "r3").path, "D:\\가상\\보고.hwp");
  assert.equal(P.referenceView(data, "r4").docNo, "가상-2026-001");
});

test("봉함 저장·암호 백업 왕복: 새 컬렉션과 연결 필드가 그대로", () =>
  sandbox(async (dir, file) => {
    const data = {
      ...empty(),
      projects: [project("p1", { referenceIds: ["r1"] })],
      references: [reference("r1")],
      tasks: [task("t1", { projectId: "p1", referenceIds: ["r1"] })],
    };
    const made = seal.createKeyring({ available: true, protect: (b) => b, unprotect: (b) => b });
    store.setSealer(keystore.ringOf(made.keyFile, made.dataKey));
    store.write(file, data, { keepLastGood: true });
    assert.ok(!fs.readFileSync(file, "utf8").includes("가상 사업"));
    const read = store.read(file);
    assert.deepEqual([read.projects, read.references, read.tasks], [data.projects, data.references, data.tasks]);
    const backup = path.join(dir, "백업.json");
    await store.writeBackup(backup, read, "가상 사업 백업 암호 2026", { params: { N: 2 ** 14, r: 8, p: 1 } });
    store.setSealer(null);
    const restored = await store.readBackup(backup, "가상 사업 백업 암호 2026");
    assert.deepEqual([restored.projects, restored.references, restored.tasks], [data.projects, data.references, data.tasks]);
  }));

test("한도: 사업·근거 각 10,000건까지, 넘으면 거부", () => {
  const many = Array.from({ length: 10001 }, (_, i) => reference(`r${i}`));
  assert.throws(() => normalize({ ...empty(), references: many }), /10,000건/);
  assert.equal(normalize({ ...empty(), references: many.slice(0, 10000) }).references.length, 10000);
});
