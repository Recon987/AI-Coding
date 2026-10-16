const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  empty, normalize, expandEventOccurrences, calendarItems, reminderItems,
  briefing, setOccurrenceDone, setOccurrenceExcluded,
} = require("../shared/model.mjs");
const store = require("../desktop/store.cjs");

// Explicit local timestamps keep the contract valid under both UTC and Korean TZ.
const event = (fields = {}) => ({
  id: "series", title: "매일 안전 확인", at: "2026-10-15T09:00:00",
  done: false, recurrence: "daily", ...fields,
});
const range = { startDate: "2026-10-15", endDate: "2026-10-18" };
const withEvent = (e) => ({ ...empty(), events: [e] });
const view = (e) => expandEventOccurrences(e, range);

test("one recurring completion keeps the first key/time and leaves future occurrences pending", () => {
  const original = event();
  const next = setOccurrenceDone(original, "2026-10-15", true);
  assert.deepEqual(original, event());
  assert.equal(next.done, false);
  assert.deepEqual(next.completedDates, ["2026-10-15"]);
  assert.deepEqual(view(next).map((e) => [e.occurrenceDate, e.done]), [
    ["2026-10-15", true], ["2026-10-16", false], ["2026-10-17", false], ["2026-10-18", false],
  ]);
  assert.equal(view(next)[0].key, "event:series");
  assert.equal(view(next)[0].at, original.at);
  assert.equal(view(next)[1].key, "event:series:2026-10-16");
  assert.deepEqual(setOccurrenceDone(next, "2026-10-15", false).completedDates, []);
});

test("excluding and restoring a completed occurrence preserves its completion history", () => {
  const completed = setOccurrenceDone(event(), "2026-10-16", true);
  const excluded = setOccurrenceExcluded(completed, "2026-10-16", true);
  assert.deepEqual(excluded.completedDates, ["2026-10-16"]);
  assert.deepEqual(excluded.excludedDates, ["2026-10-16"]);
  assert.deepEqual(view(excluded).map((e) => e.occurrenceDate), ["2026-10-15", "2026-10-17", "2026-10-18"]);
  const restored = setOccurrenceExcluded(excluded, "2026-10-16", false);
  assert.equal(view(restored).find((e) => e.occurrenceDate === "2026-10-16").done, true);
  assert.deepEqual(excluded.excludedDates, ["2026-10-16"]);
  assert.deepEqual(completed.completedDates, ["2026-10-16"]);
});

test("calendar, briefing and reminders derive the same occurrence state from one event", () => {
  const e = setOccurrenceExcluded(setOccurrenceDone(event(), "2026-10-15", true), "2026-10-16", true);
  const data = withEvent(e);
  const snapshot = JSON.stringify(data);
  assert.deepEqual(calendarItems(data, range).map((e) => [e.occurrenceDate, e.done]), [
    ["2026-10-15", true], ["2026-10-17", false], ["2026-10-18", false],
  ]);
  assert.match(briefing(data, "2026-10-15"), /\[완료\/매일\]/);
  assert.match(briefing(data, "2026-10-16"), /일정 \(0\)/);
  assert.match(briefing(data, "2026-10-17"), /\[예정\/매일\]/);
  const now = Date.parse("2026-10-16T09:00:00");
  const reminders = reminderItems(data, now);
  assert.equal(reminders.find((e) => e.id === "event:series").done, true);
  assert.equal(reminders.some((e) => e.id === "event:series:2026-10-16"), false);
  assert.equal(reminders.find((e) => e.id === "event:series:2026-10-17").done, false);
  assert.deepEqual(store.due(reminders, now, new Set()), []);
  const nextDue = Date.parse("2026-10-17T09:00:00");
  assert.deepEqual(store.due(reminderItems(data, nextDue), nextDue, new Set()).map((e) => e.id), ["event:series:2026-10-17"]);
  assert.equal(JSON.stringify(data), snapshot);
  assert.equal(data.events.length, 1);
});

test("legacy whole-series done stays effective and cannot be silently reopened for one date", () => {
  const legacy = event({ done: true });
  assert.ok(view(legacy).every((e) => e.done));
  assert.throws(() => setOccurrenceDone(legacy, "2026-10-16", false), /전체.*다시 시작/);
  const next = setOccurrenceDone(legacy, "2026-10-16", true);
  assert.equal(next.done, true);
  assert.deepEqual(legacy, event({ done: true }));
  assert.ok(view(setOccurrenceExcluded(next, "2026-10-15", true)).every((e) => e.done));
});

test("metadata must be unique real dates in bounded arrays on recurring events only", () => {
  for (const field of ["completedDates", "excludedDates"]) {
    for (const bad of [null, {}, "2026-10-15", ["2026-02-30"], ["2026-10-15", "2026-10-15"], [1], ["2026-1-01"], Array(1), ["2026-10-15", , "2026-10-17"]])
      assert.throws(() => normalize(withEvent(event({ [field]: bad }))), /회차별/);
    assert.throws(() => normalize(withEvent(event({ recurrence: "none", [field]: [] }))), /반복 일정/);
    const noRecurrence = event({ [field]: [] });
    delete noRecurrence.recurrence;
    assert.throws(() => normalize(withEvent(noRecurrence)), /반복 일정/);
  }
  assert.doesNotThrow(() => normalize(withEvent(event({ completedDates: ["2026-10-16"], excludedDates: ["2026-10-16"] }))));
});

test("metadata limits accept 10,000 dates and reject adding a 10,001st date", () => {
  const dates = Array.from({ length: 10000 }, (_, i) => new Date(Date.UTC(1980, 0, i + 1)).toISOString().slice(0, 10));
  for (const field of ["completedDates", "excludedDates"]) {
    const e = event({ [field]: dates });
    assert.deepEqual(normalize(withEvent(e)).events[0][field], dates);
    assert.throws(() => normalize(withEvent(event({ [field]: [...dates, "2026-10-16"] }))), /10,000/);
    const change = field === "completedDates" ? setOccurrenceDone : setOccurrenceExcluded;
    assert.throws(() => change(e, "2026-10-16", true), /10,000/);
    assert.equal(dates.length, 10000);
  }
});

test("actions validate current series membership, repeat end, local date and boolean state", () => {
  const weekly = event({ recurrence: "weekly", repeatUntil: "2026-10-29" });
  for (const change of [setOccurrenceDone, setOccurrenceExcluded]) {
    for (const date of ["2026-10-14", "2026-10-16", "2026-11-05", "2026-02-30"])
      assert.throws(() => change(weekly, date, true), /날짜|회차/);
    assert.throws(() => change(weekly, "2026-10-15", 1), /참 또는 거짓/);
    assert.throws(() => change(event({ recurrence: "none" }), "2026-10-15", true), /반복 일정/);
    assert.doesNotThrow(() => change(weekly, "2026-10-29", true));
  }
});

test("month-end and leap-year occurrences use the current local clamping rules", () => {
  const monthly = event({ at: "2024-01-31T09:00:00", recurrence: "monthly" });
  const completed = setOccurrenceDone(monthly, "2024-02-29", true);
  const result = expandEventOccurrences(completed, { startDate: "2024-02-01", endDate: "2024-03-31" });
  assert.deepEqual(result.map((e) => [e.occurrenceDate, e.done]), [["2024-02-29", true], ["2024-03-31", false]]);
  assert.throws(() => setOccurrenceDone(monthly, "2024-03-29", true), /회차/);
  const leap = event({ at: "2024-02-29T09:00:00", recurrence: "yearly" });
  assert.doesNotThrow(() => setOccurrenceExcluded(leap, "2025-02-28", true));
  assert.throws(() => setOccurrenceExcluded(leap, "2025-03-01", true), /회차/);
});

test("long-running excluded occurrences do not consume the 400 visible occurrence limit", () => {
  const source = event({ at: "2000-01-01T09:00:00", excludedDates: ["2026-10-15", "2026-10-16"] });
  assert.deepEqual(view(source).map((e) => e.occurrenceDate), ["2026-10-17", "2026-10-18"]);
  const many = expandEventOccurrences(source, { startDate: "2026-10-15", endDate: "2028-10-15" });
  assert.equal(many.length, 400);
  assert.equal(many[0].occurrenceDate, "2026-10-17");
});

test("metadata survives rule edits, and immutable actions return sorted idempotent lists", () => {
  const initial = event({ completedDates: ["2026-10-18", "2026-10-16"], excludedDates: ["2026-10-16"] });
  const snapshot = structuredClone(initial);
  const next = setOccurrenceDone(initial, "2026-10-15", true);
  assert.deepEqual(next.completedDates, ["2026-10-15", "2026-10-16", "2026-10-18"]);
  assert.deepEqual(setOccurrenceDone(next, "2026-10-15", true), next);
  assert.deepEqual(initial, snapshot);
  const edited = { ...initial, recurrence: "weekly", repeatUntil: "2026-10-15" };
  assert.deepEqual(normalize(withEvent(edited)).events[0], edited);
  assert.equal(view(edited).length, 1);
  assert.deepEqual(setOccurrenceExcluded(edited, "2026-10-16", false).excludedDates, []);
  assert.deepEqual(setOccurrenceDone(edited, "2026-10-16", false).completedDates, ["2026-10-18"]);
  for (const change of [setOccurrenceDone, setOccurrenceExcluded])
    assert.throws(() => change(edited, "2026-10-16", true), /회차/);
  const globallyDone = { ...edited, done: true };
  assert.deepEqual(setOccurrenceExcluded(globallyDone, "2026-10-16", false).excludedDates, []);
  assert.throws(() => setOccurrenceDone(globallyDone, "2026-10-16", false), /전체.*다시 시작/);
  assert.deepEqual(initial, snapshot);
});

test("old v3 and new metadata preserve shape across live save, protection copy and backup round-trip", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "workdesk-occurrences-"));
  try {
    const file = path.join(dir, "workdesk.json");
    const backup = path.join(dir, "backup.json");
    const old = withEvent(event());
    delete old.controls;
    fs.writeFileSync(file, JSON.stringify(old));
    const loaded = store.read(file);
    assert.deepEqual(loaded.events[0], old.events[0]);
    assert.equal(Object.hasOwn(loaded.events[0], "completedDates"), false);
    assert.equal(Object.hasOwn(loaded.events[0], "excludedDates"), false);
    const next = {
      ...loaded,
      notes: [{ id: "note", title: "보존 메모", body: "유지" }],
      events: [setOccurrenceExcluded(setOccurrenceDone(loaded.events[0], "2026-10-16", true), "2026-10-16", true)],
      controls: [{ id: "control", title: "보존 구간", zone: null, reason: "weather", start: "2026-10-16", end: null, note: "유지" }],
    };
    store.write(file, next, { keepLastGood: true });
    assert.deepEqual(store.read(file), next);
    assert.deepEqual(store.read(store.lastGoodFile(file)), next);
    store.write(backup, store.read(file));
    store.write(file, store.read(backup), { keepLastGood: true });
    assert.deepEqual(store.read(file), next);
    const bytes = fs.readFileSync(file);
    assert.throws(() => store.write(file, { ...next, events: [{ ...next.events[0], completedDates: null }] }));
    assert.deepEqual(fs.readFileSync(file), bytes);
    const protectionBytes = fs.readFileSync(store.lastGoodFile(file));
    for (const field of ["completedDates", "excludedDates"]) {
      const sparse = { ...next, events: [{ ...next.events[0], [field]: Array(1) }] };
      assert.throws(() => store.write(file, sparse, { keepLastGood: true }), /회차별/);
      assert.deepEqual(fs.readFileSync(file), bytes);
      assert.deepEqual(fs.readFileSync(store.lastGoodFile(file)), protectionBytes);
      assert.deepEqual(store.read(file), next);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
