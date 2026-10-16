// Local-date rules are checked in Korean time regardless of the machine zone.
process.env.TZ = "Asia/Seoul";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { empty } = require("../shared/model.mjs");
const { buildForm, csvCell } = require("../shared/forms.mjs");

const data = () => {
  const d = empty();
  d.patrols.push(
    {
      id: "p1",
      title: "계곡 단속 순찰",
      at: "2026-10-15T01:00:00.000Z", // 10:00 KST
      route: "계곡안내소 → 쉼터",
      observer: "가상 담당",
      findings: "샛길 출입 확인",
      action: "출입금지 안내",
      risk: "attention",
      kind: "enforcement",
      zone: "3-2",
      coordinates: { latitude: 37.6, longitude: 126.9 },
      observations: [
        { id: "o1", type: "샛길·출입금지구역 출입", count: 2, outcome: "guidance", note: "", coordinates: { latitude: 37.6512, longitude: 126.9771 } },
        { id: "o2", type: "=cmd|' /C calc'!A0", count: 1, outcome: "fine", note: '메모 "따옴표", 쉼표' },
      ],
    },
    {
      id: "p2",
      title: "능선 안전 순찰",
      at: "2026-10-14T23:30:00.000Z", // 10-15 08:30 KST
      route: "능선 → 정상",
      observer: "가상 동료",
      findings: "",
      action: "",
      risk: "normal",
    },
    { id: "p3", title: "범위 밖", at: "2026-10-16T15:00:00.000Z", route: "x", observer: "y", findings: "", action: "", risk: "normal" },
  );
  d.tasks.push({ id: "t1", title: "샛길 안내판 보강", body: "", kind: "handover", at: "2026-10-16T00:00:00.000Z", assignee: "", destination: "", priority: "normal", remindMinutes: 0, patrolId: "p1", done: false, completedAt: null });
  return d;
};
const range = { startDate: "2026-10-15", endDate: "2026-10-16" };

test("순찰일지 TXT: 기간 안 순찰을 시간순으로, 선택 항목은 있을 때만, 후속 업무와 요약 포함", () => {
  const { filename, content } = buildForm(data(), { form: "patrol-log", format: "txt", ...range });
  assert.equal(filename, "순찰일지-2026-10-15_2026-10-16.txt");
  assert.match(content, /^순찰일지 \| 2026-10-15 ~ 2026-10-16\n추천 양식 · 공식 서식 아님/);
  assert.ok(content.indexOf("능선 안전 순찰") < content.indexOf("계곡 단속 순찰"));
  assert.doesNotMatch(content, /범위 밖/);
  assert.match(content, /1\. 2026\. 10\. 15\. 08:30 \| 가상 동료 \| 일반 기록\n/);
  assert.match(content, /2\. 2026\. 10\. 15\. 10:00 \| 가상 담당 \| 단속 \| 담당구역 3-2 \| 확인 필요/);
  assert.match(content, /후속 업무: 샛길 안내판 보강\(진행 중\)/);
  assert.match(content, /요약: 순찰 2건\n- 순찰 종류: 미지정 1, 단속 1\n- 확인 등급: 일반 기록 1, 확인 필요 1\n$/);
});

test("순찰일지 CSV: 머리글·한 순찰 한 줄·위경도 칸·CRLF", () => {
  const { content } = buildForm(data(), { form: "patrol-log", format: "csv", ...range });
  const lines = content.trimEnd().split("\r\n");
  assert.equal(lines.length, 3);
  assert.match(lines[0], /^"순찰 일시","기록자","순찰 종류","담당구역"/);
  assert.match(lines[2], /"단속","3-2","계곡안내소 → 쉼터","확인 필요",.*"37\.6","126\.9","샛길 안내판 보강\(진행 중\)"$/);
});

test("단속·계도 기록: 건별 한 줄, 건 위치 우선, 유형별 합계, 수식 차단과 따옴표 처리", () => {
  const txt = buildForm(data(), { form: "enforcement-log", format: "txt", ...range }).content;
  assert.match(txt, /1\. 2026\. 10\. 15\. 10:00 \| 담당구역 3-2 \| 샛길·출입금지구역 출입 2건 \| 계도 \| 가상 담당\n   구간: 계곡안내소 → 쉼터\n   위치: 위도 37\.6512, 경도 126\.9771/);
  assert.match(txt, /위치: 위도 37\.6, 경도 126\.9\n   메모: 메모 "따옴표", 쉼표/);
  assert.match(txt, /유형별 합계 \(총 3건\)/);
  assert.match(txt, /인적사항과 과태료 금액은/);
  const { filename, content } = buildForm(data(), { form: "enforcement-log", format: "csv", ...range });
  assert.equal(filename, "단속-계도 기록-2026-10-15_2026-10-16.csv");
  const lines = content.trimEnd().split("\r\n");
  assert.equal(lines.length, 3);
  assert.match(lines[2], /"'=cmd\|' \/C calc'!A0","1","과태료 부과","37\.6","126\.9","메모 ""따옴표"", 쉼표"$/);
});

test("셀 수식 차단 규칙과 요청 검증", () => {
  assert.equal(csvCell("+1"), `"'+1"`);
  assert.equal(csvCell("-2"), `"'-2"`);
  assert.equal(csvCell("@x"), `"'@x"`);
  assert.equal(csvCell(3), `"3"`);
  assert.equal(csvCell(-126.5), `"-126.5"`);
  assert.equal(csvCell(null), `""`);
  const bad = (req, message) => assert.throws(() => buildForm(data(), { form: "patrol-log", format: "txt", ...range, ...req }), message);
  bad({ form: "facility" }, /양식 종류/);
  bad({ format: "pdf" }, /형식/);
  bad({ startDate: "2026-02-30" }, /기간/);
  bad({ startDate: "2026-10-17" }, /앞이어야/);
  bad({ startDate: "2025-01-01", endDate: "2026-12-31" }, /366일/);
  assert.match(buildForm(empty(), { form: "enforcement-log", format: "txt", ...range }).content, /단속·확인 건이 없습니다/);
});
