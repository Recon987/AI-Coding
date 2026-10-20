// TASK-HUB-B1-01: Claude 1ac80a3 제안과 게시된 B1의 차이를 실제 모델로 재현한다.
// 감사의 통과는 문서 일치 승인이 아니다. 예상한 불일치가 재현됐음을 뜻한다.
const assert = require("node:assert/strict");
const { empty, normalize, READER_VERSION, reminderItems } = require("../shared/model.mjs");
const { newWork, setWorkStatus, followUps, workSources } = require("../shared/work.mjs");
const now = "2026-10-20T03:00:00.000Z";
const cases = [];
function check(id, title, run) {
  const evidence = run();
  cases.push({ id, title, reproduced: true, ...evidence });
}
function reject(data) {
  let failure;
  try { normalize(data); } catch (error) { failure = error.message; }
  assert.ok(failure, "검증에서 거부되어야 한다");
  return failure;
}
function sample() {
  const data = empty();
  data.notes.push({ id: "n1", title: "가상 검토 메모", body: "원본" });
  data.calls.push({ id: "c1", title: "가상 전화", body: "원본", phone: "", done: false });
  data.workItems.push(newWork({ id: "w1", title: "가상 후속 작업", body: "보존할 작업 본문", now }));
  return data;
}

check("SCHEMA-B1-01", "source 필드는 보존되지만 B1 출처 관계로 인식되지 않는다", () => {
  const data = sample();
  data.workItems[0].source = { kind: "note", id: "n1", title: "가상 검토 메모" };
  const saved = normalize(data);
  assert.deepEqual(saved.workItems[0].source, data.workItems[0].source);
  assert.equal(followUps(saved, { type: "note", id: "n1" }).length, 0);
  assert.equal(workSources(saved, "w1").length, 0);
  return { outcome: "제안 source는 모르는 필드로 보존되지만 links 없이는 후속 수·출처 복귀에 반영되지 않음" };
});
check("SCHEMA-B1-01-LINKS", "links의 1:N·다중 출처·삭제 보존·상태 독립", () => {
  const data = sample();
  data.workItems.push(newWork({ id: "w2", title: "두 번째 후속", now }));
  const from = { type: "note", id: "n1" };
  for (const id of ["w1", "w2"]) data.links.push({ id: `l-${id}`, from, to: { type: "workItem", id }, role: "followUp", createdAt: now });
  data.links.push({ id: "l-call", from: { type: "call", id: "c1" }, to: { type: "workItem", id: "w1" }, role: "followUp", createdAt: now });
  assert.equal(workSources(normalize(data), "w1").length, 2);
  data.workItems[0] = setWorkStatus(data.workItems[0], "done", now);
  assert.equal(data.calls[0].done, false);
  assert.equal(followUps(data, from).length, 2);
  data.notes = [];
  const saved = normalize(data);
  assert.equal(workSources(saved, "w1")[0].label, "출처: 삭제된 메모");
  assert.equal(saved.workItems[0].body, "보존할 작업 본문");
  return { outcome: "B1 links 계약 정상. 단일 source로 자동 치환하면 복수 출처를 표현하지 못함" };
});
check("SCHEMA-B1-02-AT", "문서 kind:at 일시 기한은 B1에서 거부", () => {
  const data = sample();
  data.workItems[0].due = { kind: "at", at: now };
  const message = reject(data);
  assert.match(message, /기한/);
  data.workItems[0].due.kind = "datetime";
  data.workItems[0].remindMinutes = 0;
  assert.equal(reminderItems(normalize(data))[0].id, "work:w1");
  return { message, outcome: "게시된 판별값은 datetime" };
});
check("SCHEMA-B1-02-REMINDER", "문서에서 빠진 remindMinutes는 null 기본값까지 계약에 필요", () => {
  const data = sample(); delete data.workItems[0].remindMinutes;
  const message = reject(data);
  assert.match(message, /알림/);
  return { message, outcome: "B1 생성자는 remindMinutes:null을 저장함" };
});
check("SCHEMA-B1-03-MEETING", "회의는 B1에 존재하며 B2 필드는 선택 확장이어야 한다", () => {
  const data = sample();
  data.meetings.push({ id: "m1", title: "가상 회의", body: "결정", at: now, attendees: "가상 담당", createdAt: now, updatedAt: now });
  const saved = normalize(data);
  assert.equal(saved.meetings.length, 1);
  const oldMeeting = structuredClone(saved.meetings[0]);
  saved.meetings[0].projectIds = ["future-project"];
  saved.meetings[0].referenceIds = ["future-reference"];
  saved.meetings[0].decisions = [{ id: "d1", text: "가상 결정" }];
  const roundtrip = normalize(JSON.parse(JSON.stringify(saved)));
  assert.deepEqual(roundtrip.meetings[0].decisions, saved.meetings[0].decisions);
  const docShape = { ...roundtrip, meetings: [{ id: "m1", title: "가상 회의", at: now, attendees: "가상 담당", body: "결정", projectIds: [], decisions: [], referenceIds: [] }] };
  const message = reject(docShape);
  assert.match(message, /등록 일시/);
  assert.equal(normalize({ ...roundtrip, meetings: [oldMeeting] }).meetings.length, 1);
  return { message, outcome: "createdAt/updatedAt와 참석자 문자열 유지. B2 projectIds/decisions/referenceIds 없는 B1 행도 허용해야 함" };
});
check("SCHEMA-B1-03-TITLE", "게시된 제목 한도는 문서 200자가 아닌 500자", () => {
  const data = sample(); data.workItems[0].title = "가".repeat(500);
  assert.equal(normalize(data).workItems[0].title.length, 500);
  data.workItems[0].title += "나";
  assert.match(reject(data), /제목/);
  return { outcome: "201~500자는 유효한 B1 자료이며 B2에서 축소 거부하면 호환 회귀" };
});
check("SCHEMA-B1-COMPAT", "참조 부재·선택 확장·모르는 필드·구분값 유지", () => {
  const data = sample();
  data.workItems[0].projectId = "deleted-project";
  data.workItems[0].referenceIds = ["future-reference"];
  data.workItems[0].futureField = { value: "보존" };
  const saved = normalize(JSON.parse(JSON.stringify(data)));
  assert.equal(saved.workItems[0].projectId, "deleted-project");
  assert.deepEqual(saved.workItems[0].futureField, { value: "보존" });
  assert.equal(saved.minReader, undefined);
  // 통합(SECURITY-02 + B1) 뒤에는 3이다. 3은 봉투 전용이고, B1 내용은 판독 수준을 올리지 않는다(minReader 없음).
  assert.equal(READER_VERSION, 3);
  return { outcome: "B1 reader2 유지. 보안 봉투 reader3와의 충돌 없음. B2는 새 선택 필드를 기본값으로 읽어야 함" };
});
check("SCHEMA-B1-ENUM", "알려진 links의 순찰 출처·새 역할은 현재 B1에서 거부", () => {
  const data = sample();
  data.links.push({ id: "l1", from: { type: "patrol", id: "p1" }, to: { type: "workItem", id: "w1" }, role: "followUp", createdAt: now });
  const patrolMessage = reject(data);
  data.links[0].from.type = "note";
  data.links[0].role = "evidence";
  const roleMessage = reject(data);
  return { patrolMessage, roleMessage, outcome: "새 최상위 컬렉션과 알려진 필드의 새 열거값을 구별해야 함. 확장은 reader 호환 설계 필요" };
});

console.log(JSON.stringify({ scope: "1ac80a3 및 9f4fe7c 명세와 B1 실제 계약 대조", verdict: "명세 수정 필요 — B1 제품 정상 동작과 문서 간 불일치를 구별", reproduced: cases.length, cases }, null, 2));
