const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { empty, validate, read, write, due } = require("../desktop/store.cjs");
test("메모·일정·전화 기록의 저장과 재실행 읽기", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "workdesk-"));
  const file = path.join(dir, "data.json");
  try {
    const data = empty();
    data.notes.push({ id: "n1", title: "순찰 인수인계", body: "탐방로 확인" });
    data.events.push({
      id: "e1",
      title: "회의",
      at: "2026-10-15T09:00:00+09:00",
      done: false,
    });
    data.calls.push({
      id: "c1",
      title: "전화 회신",
      body: "연락 요청",
      phone: "000",
      done: false,
    });
    write(file, data);
    assert.deepEqual(read(file), data);
    data.notes[0].body = "수정";
    write(file, data);
    assert.equal(read(file).notes[0].body, "수정");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test("잘못된 백업·중복 ID·잘못된 날짜를 거부", () => {
  assert.throws(() => validate({ version: 2 }));
  const d = empty();
  d.events.push({ id: "e", title: "회의", at: "invalid", done: false });
  assert.throws(() => validate(d));
  const n = { id: "n", title: "메모", body: "" };
  assert.throws(() => validate({ ...empty(), notes: [n, n] }));
  assert.throws(() =>
    validate({
      ...empty(),
      folders: [{ id: "f", title: "폴더", path: "relative" }],
    }),
  );
});
test("잘못된 저장은 기존 파일을 보존", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "workdesk-"));
  try {
    const file = path.join(dir, "data.json");
    write(file, empty());
    assert.throws(() => write(file, { version: 9 }));
    assert.deepEqual(read(file), empty());
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test("알림은 해당 시간의 미완료 일정만 한 번 선택", () => {
  const now = Date.parse("2026-10-15T10:00:00Z");
  const e = {
    id: "1",
    title: "회의",
    at: new Date(now - 15000).toISOString(),
    done: false,
  };
  const list = [
    e,
    { ...e, id: "2", done: true },
    { ...e, id: "3", at: new Date(now + 1000).toISOString() },
    { ...e, id: "4", at: new Date(now - 60000).toISOString() },
  ];
  assert.deepEqual(due(list, now, new Set()), [e]);
  assert.deepEqual(due(list, now, new Set([e.id + e.at])), []);
});

test("v1 최초 전환은 원본 백업을 남기며 반복 실행에 안전", () => {
  const { migrateFile } = require("../desktop/store.cjs");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "workdesk-migration-"));
  try {
    const file = path.join(dir, "workdesk.json");
    const original = JSON.stringify({
      version: 1,
      notes: [{ id: "n", title: "보존할 메모", body: "원본 내용" }],
      events: [],
      calls: [],
      folders: [],
    });
    fs.writeFileSync(file, original);
    migrateFile(file);
    const migrated = read(file);
    assert.equal(migrated.version, 2);
    assert.equal(migrated.notes[0].body, "원본 내용");
    assert.deepEqual(migrated.tasks, []);
    assert.equal(fs.readFileSync(file + ".v1-backup.json", "utf8"), original);
    migrateFile(file);
    assert.equal(fs.readFileSync(file + ".v1-backup.json", "utf8"), original);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
const {
  normalize,
  calendarItems,
  reminderItems,
  briefing,
  dayKey,
} = require("../shared/model.mjs");
const patrol = {
  id: "p",
  title: "탐방로 점검",
  at: "2026-10-15T09:00:00+09:00",
  route: "입구 → 능선",
  observer: "테스트 담당",
  findings: "안내판 점검 필요",
  action: "현장 확인",
  risk: "attention",
};
const task = {
  id: "t",
  kind: "handover",
  title: "안내판 재점검",
  body: "재방문 필요",
  at: "2026-10-16T09:00:00+09:00",
  assignee: "담당자",
  destination: "",
  priority: "high",
  remindMinutes: 60,
  patrolId: "p",
  done: false,
  completedAt: null,
};
test("순찰과 인계 연결·완료 이력을 포함한 백업 왕복", () => {
  const d = { ...empty(), patrols: [patrol], tasks: [task] };
  assert.deepEqual(normalize(JSON.parse(JSON.stringify(d))), d);
  assert.throws(() => normalize({ ...d, patrols: [] }));
  assert.throws(() => normalize({ ...d, tasks: [{ ...task, done: true }] }));
  assert.throws(() =>
    normalize({ ...d, tasks: [{ ...task, remindMinutes: -1 }] }),
  );
  const done = {
    ...task,
    done: true,
    completedAt: "2026-10-15T10:00:00+09:00",
  };
  assert.equal(normalize({ ...d, tasks: [done] }).tasks[0].done, true);
});
test("제출과 인계의 일정 표시는 원본 변경을 즉시 반영하며 중복 일정이 없다", () => {
  const d = {
    ...empty(),
    patrols: [patrol],
    tasks: [
      task,
      {
        ...task,
        id: "t2",
        kind: "submission",
        patrolId: null,
        title: "주간 실적",
      },
    ],
  };
  assert.equal(calendarItems(d).length, 3);
  assert.equal(d.events.length, 0);
  const updated = {
    ...d,
    tasks: d.tasks.map((t) =>
      t.id === "t" ? { ...t, title: "수정된 조치" } : t,
    ),
  };
  assert.equal(
    calendarItems(updated).find((i) => i.key === "task:t").title,
    "수정된 조치",
  );
  assert.equal(calendarItems({ ...d, tasks: [] }).length, 1);
});
test("사전 알림 시점과 완료 제외를 원본 업무에서 계산", () => {
  const d = { ...empty(), patrols: [patrol], tasks: [task] };
  const reminders = reminderItems(d);
  const trigger = Date.parse(task.at) - 3600000;
  assert.equal(Date.parse(reminders[0].at), trigger);
  assert.equal(due(reminders, trigger + 1000, new Set()).length, 1);
  assert.equal(due(reminders, trigger - 1000, new Set()).length, 0);
  assert.equal(
    due(
      reminderItems({
        ...d,
        tasks: [{ ...task, done: true, completedAt: task.at }],
      }),
      trigger + 1000,
      new Set(),
    ).length,
    0,
  );
});
test("브리핑은 선택 날짜의 순찰과 기준일까지 미완료 업무만 포함", () => {
  const d = { ...empty(), patrols: [patrol], tasks: [task] };
  const text = briefing(d, dayKey(new Date(patrol.at)));
  assert.match(text, /탐방로 점검/);
  assert.doesNotMatch(text, /안내판 재점검/);
  assert.match(briefing(d, "2026-10-17"), /안내판 재점검/);
  assert.throws(() => briefing(d, "bad-date"));
});
