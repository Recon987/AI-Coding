// TASK-HUB-B3A-01: 주간 실적·계획 / 사업 추진보고 / 인수인계서 집계와 TXT·MD 렌더.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const R = require("../shared/rollup.mjs");
const { rollupFixture, nowDate, NOW_KEY } = require("./rollup-fixture.cjs");

const ids = (items) => items.map((i) => i.ref.id);
const week = () => R.weekOf(NOW_KEY);

test("기간: 월~일, 잘못된 날짜·뒤집힌 기간은 거부", () => {
  assert.deepEqual(R.weekOf("2026-10-21"), { start: "2026-10-19", end: "2026-10-25" });
  assert.deepEqual(R.weekOf("2026-10-25"), { start: "2026-10-19", end: "2026-10-25" }, "일요일은 같은 주");
  assert.deepEqual(R.weekOf("2026-10-26"), { start: "2026-10-26", end: "2026-11-01" });
  assert.throws(() => R.weekOf("2026-13-01"), /기준 날짜/);
  assert.throws(() => R.collectRollup(rollupFixture(), { start: "2026-10-25", end: "2026-10-19" }), /보고 기간/);
});

test("분류: 완료(작업·인계·제출)·회의·현재 미완료·다음 주·마일스톤, 날짜 없는 메모는 실적 아님", () => {
  const r = R.collectRollup(rollupFixture(), week(), nowDate());
  assert.deepEqual(ids(r.done), ["done-in", "t-done"], "기간 밖 완료(done-before)는 제외");
  assert.deepEqual(r.done.map((i) => i.kind), ["작업", "제출"]);
  assert.deepEqual(ids(r.meetings), ["m1"]);
  assert.deepEqual(ids(r.open).sort(), ["follow", "open-later", "open-next", "open-overdue", "t-open"]);
  assert.ok(r.open.find((i) => i.ref.id === "open-overdue").overdue, "지난 기한은 기간과 무관하게 현재 미완료로 남고 경과 표시");
  assert.deepEqual(ids(r.next), ["t-open", "open-next"], "다음 7일 안의 기한만, 날짜순");
  assert.deepEqual(ids(r.milestones), ["p1"], "AX 마일스톤(11-05)은 다음 주 밖");
  const all = [...r.done, ...r.open, ...r.next, ...r.meetings].map((i) => i.ref.type);
  assert.ok(!all.includes("note"), "메모는 실적·계획에 들어가지 않음");
  // Every fact keeps its source record.
  for (const i of [...r.done, ...r.open, ...r.meetings, ...r.milestones]) assert.ok(i.ref.type && i.ref.id);
});

test("같은 원본은 한 절에 한 번, 사용자가 뺀 항목은 제외", () => {
  const r = R.collectRollup(rollupFixture(), { ...week(), exclude: ["workItem:done-in", "project:p1"] }, nowDate());
  assert.deepEqual(ids(r.done), ["t-done"]);
  assert.deepEqual(ids(r.milestones), []);
  for (const section of [r.done, r.open, r.next]) assert.equal(new Set(ids(section)).size, section.length);
});

test("사업 범위: 사업 하나 / 사업 없음만 — 회의·순찰은 사업 범위에 넣지 않음", () => {
  const one = R.collectRollup(rollupFixture(), { ...week(), projectId: "p1" }, nowDate());
  assert.deepEqual(ids(one.done), ["done-in", "t-done"]);
  assert.deepEqual(ids(one.open), ["open-next"]);
  assert.deepEqual([one.meetings.length, one.patrol.count], [0, 0]);
  const none = R.collectRollup(rollupFixture(), { ...week(), projectId: null }, nowDate());
  assert.deepEqual(ids(none.open).sort(), ["open-overdue", "t-open"], "끊긴 사업을 가리키는 작업은 '사업 없음'이 아님");
});

test("출처·근거·끊긴 참조 표시", () => {
  const r = R.collectRollup(rollupFixture(), week(), nowDate());
  const follow = r.open.find((i) => i.ref.id === "follow");
  assert.deepEqual(follow.sources, ["출처: 전화메모 · 가상 민원 전화", "출처: 삭제된 메모 — 가상 지운 회의 메모"]);
  assert.equal(follow.projectTitle, "사업 없음(삭제됨)");
  const done = r.done.find((i) => i.ref.id === "done-in");
  assert.deepEqual(done.references.map((x) => x.label), ["가상 공문", "가상 도면"]);
  assert.equal(done.projectTitle, "가상 탐방로 정비");
});

test("순찰 요약: 건수·종류·주의/긴급·단속 집계만(개인 정보·금액 없음)", () => {
  const { patrol } = R.collectRollup(rollupFixture(), week(), nowDate());
  assert.equal(patrol.count, 3, "기간 밖(10-18) 제외, 일요일 저녁 포함");
  assert.deepEqual(patrol.byKind, { "안전 순찰": 1, 단속: 1, "구분 없음": 1 });
  assert.deepEqual([patrol.attention, patrol.urgent], [1, 1]);
  assert.equal(patrol.observations, "흡연 2건(계도)");
});

test("주간 실적·계획 TXT·MD: 절 구성, 본문·경로는 기본 제외, 선택 시 포함", () => {
  const data = rollupFixture();
  const r = R.collectRollup(data, week(), nowDate());
  const txt = R.renderReport("weekly", data, r);
  assert.equal(txt.filename, "주간 실적계획-2026-10-19_2026-10-25.txt");
  for (const head of ["■ 이번 주 실적", "■ 회의", "■ 현장 순찰", "■ 다음 주 계획 (2026-10-26 ~ 2026-11-01)", "■ 진행 중·대기 (현재 상태)"])
    assert.ok(txt.content.includes(head), head);
  assert.match(txt.content, /\[가상 탐방로 정비\]\n- 2026-10-21 \[작업\] 가상 데크 보수 확인/);
  assert.match(txt.content, /가상 밀린 작업 · 진행 중 · 기한 경과\(/);
  assert.match(txt.content, /※ 현재 자료 기준 초안입니다/);
  assert.ok(!txt.content.includes("가상 비공개 메모 본문") && !txt.content.includes("C:\\가상"), "본문·실제 경로는 기본 제외");
  const full = R.renderReport("weekly", data, r, { includeBodies: true, includePaths: true });
  assert.ok(full.content.includes("내용: 가상 비공개 메모 본문") && full.content.includes("C:\\가상\\도면.pdf"));
  const md = R.renderReport("weekly", data, r, { format: "md" });
  assert.ok(md.content.startsWith("# 주간 실적·계획 (2026-10-19 ~ 2026-10-25)\n"));
  assert.match(md.content, /\n## 이번 주 실적\n### 가상 탐방로 정비\n/);
  assert.equal(md.filename.endsWith(".md"), true);
  assert.throws(() => R.renderReport("monthly", data, r), /유형/);
  assert.throws(() => R.renderReport("weekly", data, r, { format: "hwp" }), /형식/);
});

test("사업 추진보고: 개요·실적·계획·근거, AX 금액은 모듈이 켜졌을 때만 '현재 값'으로", () => {
  const data = rollupFixture();
  const r = R.collectRollup(data, { ...week(), projectId: "p1" }, nowDate());
  const report = R.renderReport("project", data, r);
  assert.equal(report.filename, "사업 추진보고-가상 탐방로 정비-2026-10-19_2026-10-25.txt");
  assert.match(report.content, /분야: 시설 · 단계: 추진 · 담당: 가상 담당/);
  assert.match(report.content, /■ 근거 자료\n- 공문·문서번호: 가상 공문 \(가상-2026-77\)\n- 삭제된 자료/);
  assert.match(report.content, /2026-10-28 \[마일스톤\] 가상 탐방로 정비 · 중간 점검/);
  const ax = R.collectRollup(data, { ...week(), projectId: "a1" }, nowDate());
  assert.match(R.renderReport("project", data, ax).content, /사업비 1,000천원 · 집행액 250천원 \(현재 값\)/);
  assert.doesNotMatch(R.renderReport("project", data, ax, { axEnabled: false }).content, /천원/);
  // The closing note explains the rule; the body above it must not report any change.
  assert.doesNotMatch(R.renderReport("project", data, ax).content.split("※")[0], /변화|증가|감소/, "이력 없는 변화는 쓰지 않음");
  assert.throws(() => R.renderReport("project", data, R.collectRollup(data, week(), nowDate())), /사업 하나/);
});

test("인수인계서: 현재 미완료 전체를 사업별로, 다음 주 기한·회의·완료", () => {
  const data = rollupFixture();
  const content = R.renderReport("handover", data, R.collectRollup(data, week(), nowDate()), { format: "md" }).content;
  const order = ["## 인계할 업무 (현재 미완료 전체)", "## 다음 주 기한", "## 기간 중 회의", "## 기간 중 완료"].map((h) => content.indexOf(h));
  assert.ok(order.every((n, i) => n > 0 && (i === 0 || n > order[i - 1])), "절 순서");
  assert.match(content, /### 사업 없음\n- \[작업\] 가상 밀린 작업/);
  assert.match(content, /  - 출처: 삭제된 메모 — 가상 지운 회의 메모/);
});

test("다섯 시간대에서 같은 현지 기록이면 보고서가 같다", () => {
  const outputs = ["Asia/Seoul", "UTC", "Pacific/Kiritimati", "Pacific/Pago_Pago", "America/New_York"].map((tz) =>
    execFileSync(process.execPath, ["-e", `
      const R = require("./shared/rollup.mjs");
      const { rollupFixture, nowDate, NOW_KEY } = require("./tests/rollup-fixture.cjs");
      const data = rollupFixture();
      const r = R.collectRollup(data, R.weekOf(NOW_KEY), nowDate());
      const p = R.collectRollup(data, { ...R.weekOf(NOW_KEY), projectId: "p1" }, nowDate());
      process.stdout.write(["weekly", "handover"].map((t) => R.renderReport(t, data, r).content).join("\\n") + R.renderReport("project", data, p, { format: "md" }).content);
    `], { cwd: path.resolve(__dirname, ".."), env: { ...process.env, TZ: tz }, encoding: "utf8" }),
  );
  for (const out of outputs.slice(1)) assert.equal(out, outputs[0]);
  assert.match(outputs[0], /2026-10-21 \[작업\] 가상 데크 보수 확인/);
});
