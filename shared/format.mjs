const invalidDate = "날짜 확인 필요";
const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

function localDate(value) {
  if (value instanceof Date) return new Date(value.getTime());
  if (typeof value !== "string" || !value.trim()) return new Date(NaN);
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!parts) return new Date(value);
  const [, year, month, day] = parts.map(Number);
  // Date-only values name a local calendar day, never a UTC instant.
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(12, 0, 0, 0);
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : new Date(NaN);
}

export function formatDate(value, { year = true, weekday = true } = {}) {
  const date = localDate(value);
  if (!Number.isFinite(date.getTime())) return invalidDate;
  const day = `${date.getMonth() + 1}. ${date.getDate()}.`;
  return `${year ? `${date.getFullYear()}. ` : ""}${day}${weekday ? ` (${weekdays[date.getDay()]})` : ""}`;
}

export function formatClock(value) {
  const date = localDate(value);
  if (!Number.isFinite(date.getTime())) return invalidDate;
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function formatTime(value) {
  const date = localDate(value);
  if (!Number.isFinite(date.getTime())) return invalidDate;
  return `${formatDate(date, { weekday: false })} ${formatClock(date)}`;
}
