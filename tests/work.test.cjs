const { test } = require("node:test");
const assert = require("node:assert/strict");
const now = "2026-10-20T03:00:00.000Z";
const load = async () => ({ ...await import("../shared/model.mjs"), ...await import("../shared/work.mjs"), ...await import("../shared/search.mjs") });

test("B1: 선택 컬렉션 없는 구판·모르는 항목·등록과 완료의 비파괴 왕복", async () => {
  const { empty, normalize, newWork, setWorkStatus, calendarItems, reminderItems, briefing, searchRecords } = await load();
  const old = empty();
  delete old.workItems; delete old.meetings; delete old.links;
  old.futureRecords = [{ value: "보존" }];
  const data = normalize(old);
  assert.deepEqual(data.workItems, []);
  const work = newWork({ id: "w1", title: "예산 자료 정리", body: "원문 보존", now });
  data.workItems.push(work);
  assert.equal(calendarItems(data).length, 0);
  assert.equal(reminderItems(data).length, 0);
  assert.match(briefing(data, "2026-10-20"), /예산 자료 정리.*기한 없음/);
  assert.equal(searchRecords(data, "원문 보존")[0].page, "work");
  const saved = normalize(JSON.parse(JSON.stringify(data)));
  assert.deepEqual(saved.futureRecords, old.futureRecords);
  assert.equal(saved.minReader, undefined);
  const done = setWorkStatus(work, "done", now);
  assert.equal(done.completedAt, now);
  assert.equal(setWorkStatus(done, "doing", now).completedAt, null);
  assert.equal(work.status, "todo");
});

test("B1: 메모·전화·회의의 1:N 후속 연결과 원본 삭제·상태 독립", async () => {
  const { empty, normalize, newWork, followUps, workSources, setWorkStatus } = await load();
  const data = empty();
  data.calls.push({ id: "c1", title: "회신 요청", body: "내용", phone: "", done: false });
  for (const id of ["w1", "w2"]) {
    data.workItems.push(newWork({ id, title: id, body: "후속 본문", now }));
    data.links.push({ id: `l-${id}`, from: { type: "call", id: "c1" }, to: { type: "workItem", id }, role: "followUp", createdAt: now });
  }
  data.workItems[0] = setWorkStatus(data.workItems[0], "done", now);
  assert.equal(followUps(data, { type: "call", id: "c1" }).filter((w) => w.status === "done").length, 1);
  assert.equal(data.calls[0].done, false);
  assert.equal(workSources(data, "w1")[0].page, "calls");
  data.calls = [];
  const saved = normalize(data);
  assert.equal(workSources(saved, "w1")[0].label, "출처: 삭제된 전화메모");
  assert.equal(saved.workItems[0].body, "후속 본문");
  assert.equal(saved.links.length, 2);
  const duplicated = structuredClone(saved);
  duplicated.links.push({ ...duplicated.links[0], id: "other" });
  assert.throws(() => normalize(duplicated), /중복/);
});

test("B1: 날짜만 기한의 현지 날짜 판정·달력·알림과 통합 정렬", async () => {
  const { empty, newWork, normalize, dueState, dueText, calendarItems, reminderItems, unifiedWork } = await load();
  const data = empty();
  const localNow = new Date(2026, 9, 20, 12);
  for (const [id, date] of [["tomorrow", "2026-10-21"], ["yesterday", "2026-10-19"], ["today", "2026-10-20"], ["none", null]])
    data.workItems.push({ ...newWork({ id, title: id, now }), due: date ? { kind: "date", date } : null });
  assert.deepEqual(data.workItems.map((w) => dueState(w, localNow)), ["upcoming", "overdue", "today", "none"]);
  assert.equal(dueState(data.workItems[2], new Date(2026, 9, 20, 23, 59)), "today");
  assert.doesNotMatch(dueText(data.workItems[2]), /00:00/);
  assert.match(dueText(data.workItems[2]), /2026\. 10\. 20\./);
  assert.deepEqual(unifiedWork(data, localNow).map((w) => w.id), ["yesterday", "today", "tomorrow", "none"]);
  assert.equal(calendarItems(data, { startDate: "2026-10-20", endDate: "2026-10-20" })[0].id, "today");
  assert.equal(reminderItems(data).length, 0);
  data.workItems[0].remindMinutes = 0;
  assert.throws(() => normalize(data), /알림/);
  data.workItems[0] = { ...data.workItems[0], due: { kind: "datetime", at: now }, remindMinutes: 60 };
  assert.equal(reminderItems(normalize(data))[0].at, "2026-10-20T02:00:00.000Z");
});

test("B1: 잘못된 기한·상태·완료·목록 한도는 저장 전 거부", async () => {
  const { empty, newWork, normalize } = await load();
  for (const patch of [
    { due: { kind: "date", date: "2026-02-30" } },
    { due: { kind: "datetime", at: "2026-10-20T10:00" } },
    { status: "unknown" }, { status: "done", completedAt: null },
    { completedAt: now }, { remindMinutes: 60 }, { title: " " },
  ]) {
    const data = { ...empty(), workItems: [{ ...newWork({ id: "w", title: "업무", now }), ...patch }] };
    assert.throws(() => normalize(data));
  }
  for (const key of ["workItems", "meetings", "links"]) {
    assert.throws(() => normalize({ ...empty(), [key]: null }));
    assert.throws(() => normalize({ ...empty(), [key]: Array(10001).fill({}) }), /10,000/);
  }
});
