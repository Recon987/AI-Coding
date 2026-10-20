// TASK-HUB-B2A-01: 10,000건 혼합 가상 자료(메모·전화·인계·사업·AX·근거·작업)의 크기와
// 정규화·저장·봉함·암호 백업 시간을 잰다. 측정 전용이며 앱은 이 파일을 쓰지 않는다.
// node scripts/hub-bench.cjs
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const store = require("../desktop/store.cjs");
const seal = require("../desktop/seal.cjs");
const keystore = require("../desktop/keystore.cjs");
const { empty, normalize } = require("../shared/model.mjs");
store.retry.wait = () => {};

const NOW = "2026-10-20T09:00:00.000Z";
const words = (n) => "가상 업무 내용 확인 ".repeat(n).trim();
function sample() {
  const d = empty();
  for (let i = 0; i < 1000; i++)
    d.projects.push({ id: `p${i}`, title: `가상 시설 정비 사업 ${i}`, field: ["facility", "resource", "admin", "general"][i % 4], stage: "progress",
      manager: "가상 담당", nextMilestone: "중간 점검", nextMilestoneDate: "2026-11-02", risks: words(5), notes: words(10), referenceIds: [`r${i}`, `r${i + 1}`], updatedAt: NOW });
  for (let i = 0; i < 500; i++)
    d.axProjects.push({ id: `a${i}`, title: `가상 AX 사업 ${i}`, zone: "west", stage: "execution", budgetTotal: 1000, budgetExecuted: 250, manager: "가상",
      partner: "가상 협력사", nextMilestone: "점검", nextMilestoneDate: "2026-11-02", risks: "", notes: words(10), updatedAt: NOW, referenceIds: [`r${i}`] });
  for (let i = 0; i < 2500; i++) {
    d.references.push({ id: `r${i}`, title: `가상 공문 ${i}`, kind: "docNo", targetId: null, path: null, docNo: `가상-2026-${i}`, note: words(3), addedAt: NOW });
    d.notes.push({ id: `n${i}`, title: `가상 회의 메모 ${i}`, body: words(40) });
    d.calls.push({ id: `c${i}`, title: `가상 전화 ${i}`, body: words(15), phone: "010-0000-0000", done: i % 2 === 0 });
    d.tasks.push({ id: `t${i}`, title: `가상 인계 ${i}`, body: words(15), kind: i % 2 ? "handover" : "submission", at: "2026-10-21T09:00:00+09:00",
      assignee: "가상", destination: "가상 부서", priority: "normal", remindMinutes: 0, patrolId: null, done: false, completedAt: null,
      ...(i % 2 ? { projectId: `p${i % 1000}`, referenceIds: [`r${i}`] } : {}) });
  }
  // B1 workItems is Codex's card; here it is an unknown top-level key of the expected shape.
  d.workItems = Array.from({ length: 2500 }, (_, i) => ({ id: `w${i}`, title: `가상 후속 작업 ${i}`, body: words(15), status: "todo",
    due: { kind: "date", date: "2026-10-23" }, projectId: `p${i % 1000}`, source: { kind: "call", id: `c${i}`, title: `가상 전화 ${i}` },
    referenceIds: [`r${i}`], owner: "가상", priority: "normal", createdAt: NOW, updatedAt: NOW, completedAt: null }));
  return d;
}
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
async function time(fn, runs = 5) {
  const out = [];
  for (let i = 0; i < runs; i++) {
    const t = process.hrtime.bigint();
    await fn();
    out.push(Number(process.hrtime.bigint() - t) / 1e6);
  }
  return `${median(out).toFixed(0)}ms`;
}
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hub-bench-"));
  try {
    const data = sample();
    const plain = JSON.stringify(normalize(data), null, 2);
    const file = path.join(dir, "workdesk.json");
    const rows = [["평문 크기", `${(Buffer.byteLength(plain) / 1024 / 1024).toFixed(2)}MB`], ["정규화", await time(() => normalize(data))]];
    rows.push(["저장(평문, last-good 포함)", await time(() => store.write(file, data, { keepLastGood: true }))]);
    rows.push(["읽기(평문)", await time(() => store.read(file))]);
    const made = seal.createKeyring({ available: true, protect: (b) => b, unprotect: (b) => b });
    store.setSealer(keystore.ringOf(made.keyFile, made.dataKey));
    rows.push(["저장(봉함, last-good 포함)", await time(() => store.write(file, data, { keepLastGood: true }))]);
    rows.push(["봉한 파일 크기", `${(fs.statSync(file).size / 1024 / 1024).toFixed(2)}MB`]);
    rows.push(["읽기(봉함)", await time(() => store.read(file))]);
    const backup = path.join(dir, "backup.json");
    rows.push(["암호 백업 쓰기(scrypt N=2^17)", await time(() => store.writeBackup(backup, data, "가상 측정용 백업 암호 2026"), 3)]);
    rows.push(["암호 백업 읽기", await time(() => store.readBackup(backup, "가상 측정용 백업 암호 2026"), 3)]);
    console.log(`Node ${process.version}, ${os.cpus()[0].model}`);
    for (const [k, v] of rows) console.log(`${k}\t${v}`);
  } finally {
    store.setSealer(null);
    fs.rmSync(dir, { recursive: true, force: true });
  }
})();
