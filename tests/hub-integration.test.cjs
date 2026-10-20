const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { empty, normalize, READER_VERSION } = require("../shared/model.mjs");
const { newWork, followUps, workSources } = require("../shared/work.mjs");
const { validReferenceIds, validateSource, sourceView } = require("../shared/projects.mjs");
const store = require("../desktop/store.cjs");
const seal = require("../desktop/seal.cjs");
const { ringOf } = require("../desktop/keystore.cjs");
const now = "2026-10-20T10:00:00.000Z";
const data = () => {
  const d = empty();
  d.calls.push({ id: "c", title: "가상 전화", body: "원본", phone: "", done: false });
  d.meetings.push({ id: "m", title: "가상 회의", body: "회의", at: now, attendees: "가상 담당", createdAt: now, updatedAt: now });
  d.workItems.push(newWork({ id: "w", title: "가상 작업", now }));
  d.links.push({ id: "l", from: { type: "meeting", id: "m" }, to: { type: "workItem", id: "w" }, role: "followUp", createdAt: now });
  return d;
};

test("B1+B2a: 기존 회의·링크·모르는 필드를 삭제/이관 없이 읽고 공동 출처 함수 사용", () => {
  const d = data();
  d.workItems[0].future = { value: "유지" };
  const input = structuredClone(d);
  const n = normalize(d);
  assert.equal(READER_VERSION, 3);
  assert.equal(n.minReader, undefined);
  assert.deepEqual(n.links, d.links);
  assert.deepEqual(n.meetings, d.meetings);
  assert.equal(workSources(n, "w")[0].page, "meetings");
  assert.equal(sourceView(n, validateSource({ kind: "meeting", id: "m", title: "이전 제목" })).label, "출처: 회의 기록 · 가상 회의");
  assert.deepEqual(n.workItems[0].future, { value: "유지" });
  assert.deepEqual(d, input);
});

test("B1+B2a: 옛 source 형식과 알림 필드 누락은 보존·알림 없음, 관계 중복 표시 없음", () => {
  const d = data();
  d.workItems[0].source = { kind: "call", id: "c", title: "전화 사본" };
  delete d.workItems[0].remindMinutes;
  const n = normalize(d);
  assert.equal(n.workItems[0].remindMinutes, null);
  assert.equal(followUps(n, { type: "call", id: "c" }).length, 1);
  n.links.push({ id: "l2", from: { type: "call", id: "c", title: "전화 사본" }, to: { type: "workItem", id: "w" }, role: "followUp", createdAt: now });
  assert.equal(workSources(n, "w").length, 2);
  assert.equal(followUps(n, { type: "call", id: "c" }).length, 1);
  n.calls = [];
  assert.equal(workSources(normalize(n), "w")[1].label, "출처: 삭제된 전화메모 — 전화 사본");
  assert.doesNotThrow(() => validateSource({ kind: "note", id: "n", title: "가".repeat(500) }));
});

test("B2a 보완: 빈 칸이 있는 근거 배열은 쓰기 전에 거부하고 정상 파일 보존", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hub-ref-shape-"));
  const file = path.join(dir, "data.json");
  try {
    const d = data(); store.write(file, d);
    const before = fs.readFileSync(file);
    assert.equal(validReferenceIds(Array(1)), false);
    d.workItems[0].referenceIds = Array(1);
    assert.throws(() => store.write(file, d), /근거/);
    assert.deepEqual(fs.readFileSync(file), before);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("B2b 자료 연결: 메모·전화·회의·순찰의 여러 사업·근거, 끊긴 대상은 보존", () => {
  const d = data();
  for (const row of [d.calls[0], d.meetings[0]]) {
    row.projectIds = ["deleted-project", "another-project"];
    row.referenceIds = ["deleted-reference"];
  }
  assert.deepEqual(normalize(d).calls[0].projectIds, d.calls[0].projectIds);
  d.meetings[0].projectIds = ["duplicate", "duplicate"];
  assert.throws(() => normalize(d), /사업 목록/);
});

test("보안+B1+B2a: 새 컬렉션·출처·회의는 봉함 저장·암호 백업 왕복에서 무손실", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hub-sealed-roundtrip-"));
  const file = path.join(dir, "data.json"), backup = path.join(dir, "backup.json");
  try {
    const d = normalize(data());
    const made = seal.createKeyring({ protect: (b) => b, unprotect: (b) => b });
    store.setSealer(ringOf(made.keyFile, made.dataKey));
    store.write(file, d, { keepLastGood: true });
    assert.ok(JSON.parse(fs.readFileSync(file, "utf8")).sealed);
    assert.deepEqual(store.read(file), d);
    assert.deepEqual(store.read(store.lastGoodFile(file)), d);
    await store.writeBackup(backup, d, "가상 통합 백업 암호 2026", { params: { N: 2 ** 14, r: 8, p: 1 } });
    store.setSealer(null);
    assert.deepEqual(await store.readBackup(backup, "가상 통합 백업 암호 2026"), d);
  } finally { store.setSealer(null); fs.rmSync(dir, { recursive: true, force: true }); }
});
