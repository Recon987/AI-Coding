// TASK-AXDESK-03: AX report draft — fixed four sections filled only from the saved project,
// "[작성 필요]" for everything else, strict request checks and Windows-safe file names.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { buildAxReport, checkAxReportRequest, safeFileTitle, TODO } = require("../shared/ax-report.mjs");
const { empty, normalize } = require("../shared/model.mjs");

const DATE = "2026-10-19";
const project = (over = {}) => ({
  id: "a1",
  title: "가상 혼잡도 분석",
  zone: "west",
  stage: "execution",
  budgetTotal: 1000,
  budgetExecuted: 250,
  manager: "가상 담당",
  partner: "가상 협력사",
  nextMilestone: "중간보고회",
  nextMilestoneDate: "2026-10-28",
  risks: "가상 위험",
  notes: "",
  updatedAt: "2026-10-19T00:00:00.000Z",
  ...over,
});
const data = (...projects) => normalize({ ...empty(), axProjects: projects });
const report = (p, format = "txt") => buildAxReport(data(p), { projectId: p.id, format }, DATE);
const todoItems = (text) => text.split("\n").filter((line) => /^\s*- /.test(line) && line.includes(TODO)).length;

test("4개 절이 순서대로, 기록한 값만 채우고 나머지는 [작성 필요]", () => {
  const { content, filename } = report(project());
  const sections = content.split("\n").filter((line) => /^\d\. /.test(line));
  assert.deepEqual(sections, ["1. 사업개요", "2. 추진배경", "3. 추진실적", "4. 향후계획"]);
  for (const value of ["가상 혼잡도 분석", "서부", "수행/실증", "1,000천원", "가상 담당", "가상 협력사", "집행액 250천원, 집행률 25%", "중간보고회 (2026-10-28)", "가상 위험"])
    assert.ok(content.includes(value), value);
  // What the record cannot say stays open: period, background, results, plan.
  assert.equal(todoItems(content), 4);
  assert.match(content, /\[작성 필요\] 항목 4곳을 채운 뒤 사용하세요\.\n$/);
  assert.match(content, /공식 서식이 아니며 AI가 만든 문서가 아닙니다/);
  assert.equal(filename, "AX사업보고서초안-가상 혼잡도 분석-2026-10-19.txt");
});

test("빈 칸·예산 미등록·초과 집행: 계산하지 않거나 사실 그대로, 지어내지 않음", () => {
  const blank = project({ budgetTotal: 0, budgetExecuted: 0, manager: "", partner: "", nextMilestone: "", nextMilestoneDate: null, risks: "" });
  const content = report(blank).content;
  assert.equal(todoItems(content), 9);
  assert.match(content, /사업비: \[작성 필요\] 사업비\(앱에 예산 미등록\)/);
  assert.match(content, /사업비 미등록이라 집행률 계산 안 함/);
  assert.doesNotMatch(content, /%/);
  const over = report(project({ budgetExecuted: 1130 })).content;
  assert.match(over, /집행률 113% \(사업비보다 130천원 많음 — 확인 필요\)/);
  // A milestone text without a date asks for the date instead of guessing one.
  assert.match(report(project({ nextMilestoneDate: null })).content, /차기 마일스톤: 중간보고회 \(\[작성 필요\] 날짜\)/);
  // Notes are shown as the user's memo, not as the background itself.
  assert.match(report(project({ notes: "가상 메모" })).content, /- \[작성 필요\] 추진 필요성과 근거.*\n  - 참고 — 앱에 기록한 메모: 가상 메모/);
});

test("TXT와 MD는 같은 내용, 표기만 다르고 여러 줄 입력은 항목 안에 들여 쓴다", () => {
  const p = project({ risks: "첫째 줄\n둘째 줄" });
  const txt = report(p, "txt").content;
  const md = report(p, "md").content;
  assert.match(txt, /^AX 사업 보고서 초안 — 가상 혼잡도 분석\n=+\n/);
  assert.match(md, /^# AX 사업 보고서 초안 — 가상 혼잡도 분석\n> 작성 기준일/);
  assert.match(md, /\n>\n> 공식 서식이 아니며/);
  assert.match(md, /\n## 3\. 추진실적\n/);
  assert.match(txt, /\n  - 위험·이슈: 첫째 줄\n    둘째 줄\n/);
  assert.match(md, /\n- 위험·이슈: 첫째 줄\n  둘째 줄\n/);
  const items = (text) => text.split("\n").filter((l) => /^\s*- /.test(l)).map((l) => l.replace(/^\s*- /, ""));
  assert.deepEqual(items(txt), items(md));
  assert.ok(report(p, "md").filename.endsWith(".md"));
});

test("요청 검증: 사업 ID·형식만, 다른 키·모르는 형식·없는 사업·잘못된 날짜는 거부", () => {
  const d = data(project());
  assert.equal(checkAxReportRequest(d, { projectId: "a1", format: "md" }).id, "a1");
  for (const [request, message] of [
    [null, /요청을 확인/],
    [["a1"], /요청을 확인/],
    [{ projectId: "a1", format: "txt", path: "C:/x.txt" }, /요청을 확인/],
    [{ projectId: "a1", format: "txt", content: "가짜 본문" }, /요청을 확인/],
    [{ projectId: "a1", format: "html" }, /TXT 또는 MD/],
    [{ projectId: "없음", format: "txt" }, /사업을 찾을 수 없습니다/],
    [{ projectId: ["a1"], format: "txt" }, /사업을 찾을 수 없습니다/],
  ])
    assert.throws(() => buildAxReport(d, request, DATE), message, JSON.stringify(request));
  assert.throws(() => buildAxReport(d, { projectId: "a1", format: "txt" }, "2026-02-30"), /작성 기준일/);
  // The input is not changed.
  assert.deepEqual(d, data(project()));
});

test("파일 이름: Windows에서 쓸 수 없는 글자·장치 이름·끝 점을 정리하고 60자로 자른다", () => {
  assert.equal(safeFileTitle('가상: A/B\\C*D?"E"<F>|G'), "가상 A B C D E F G");
  assert.equal(safeFileTitle("끝에 점..."), "끝에 점");
  assert.equal(safeFileTitle("CON"), "AX사업");
  assert.equal(safeFileTitle("com1.txt"), "AX사업");
  assert.equal(safeFileTitle("  \t\n "), "AX사업");
  assert.equal(safeFileTitle("가".repeat(80)).length, 60);
  assert.equal(report(project({ title: "../../가상" })).filename, "AX사업보고서초안-.. .. 가상-2026-10-19.txt");
});
