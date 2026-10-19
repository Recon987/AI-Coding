export function validDateKey(value: unknown): value is string;
export function addDays(key: string, n: number): string;
export function weekStart(key: string): string;
export function weekDays(key: string): string[];
export function daysInclusive(start: string, end: string): number;
export function periodRange(
  period: "week" | "month" | "30days",
  today: string,
): { startDate: string; endDate: string };
export function earliestLocalDay(at: string): string;
/** True on Saturday or Sunday. */
export function isWeekend(key: string): boolean;
/** Closest earlier working day, skipping weekends and `isHoliday` days (at most 31 days back). */
export function previousWorkday(key: string, isHoliday?: (key: string) => boolean): string;
/** Local-time Date like `new Date(y, m, d, …)` that keeps years 0–99 as written. */
export function localDate(year: number, monthIndex: number, day: number, hours?: number, minutes?: number, seconds?: number, ms?: number): Date;
