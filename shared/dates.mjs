// Calendar-day arithmetic on "YYYY-MM-DD" keys (TASK-DATES-01).
// Keys name calendar days, so the math runs on UTC noon and never on the PC's
// time zone: the same key gives the same result on every machine. Pure: no DOM.
const DAY_MS = 86400000;
const KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar date such as "2026-02-28" (not "2026-02-30"). */
export function validDateKey(value) {
  if (typeof value !== "string" || !KEY.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const toUtc = (key) => {
  if (!validDateKey(key)) throw new Error("날짜 형식을 확인하세요.");
  return new Date(`${key}T12:00:00Z`);
};
const toKey = (date) => date.toISOString().slice(0, 10);

/** The day `n` days after `key` (negative moves back). */
export function addDays(key, n) {
  const date = toUtc(key);
  date.setUTCDate(date.getUTCDate() + n);
  return toKey(date);
}

/** Monday of the week containing `key` (weeks run Monday–Sunday). */
export function weekStart(key) {
  return addDays(key, -((toUtc(key).getUTCDay() + 6) % 7));
}

/** The seven keys Monday…Sunday of the week containing `key`. */
export function weekDays(key) {
  const first = weekStart(key);
  return Array.from({ length: 7 }, (_, n) => addDays(first, n));
}

/** Number of days from `start` to `end`, counting both ends ("same day" is 1). */
export function daysInclusive(start, end) {
  return (toUtc(end) - toUtc(start)) / DAY_MS + 1;
}

/** Summary/export periods ending around `today`: this week, this month or the last 30 days. */
export function periodRange(period, today) {
  if (period === "week") {
    const days = weekDays(today);
    return { startDate: days[0], endDate: days[6] };
  }
  if (period === "month") {
    const date = toUtc(today);
    // Date.UTC의 0~99년 보정 없이 입력 날짜의 연도를 그대로 유지한다.
    date.setUTCMonth(date.getUTCMonth() + 1, 0);
    return { startDate: `${today.slice(0, 8)}01`, endDate: toKey(date) };
  }
  if (period === "30days") return { startDate: addDays(today, -29), endDate: today };
  throw new Error("집계 기간을 확인하세요.");
}

/**
 * Earliest local calendar day a stored timestamp can belong to, the same on every PC.
 * With a zone (…Z or ±hh:mm) the local day may be one day before the UTC day; without
 * one the written date already is the local day (TASK-DATES-01, Codex P3).
 */
export function earliestLocalDay(at) {
  const written = typeof at === "string" ? at.slice(0, 10) : "";
  if (typeof at === "string" && !/(Z|[+-]\d{2}:?\d{2})$/i.test(at) && validDateKey(written))
    return written;
  return addDays(new Date(Date.parse(at)).toISOString().slice(0, 10), -1);
}
