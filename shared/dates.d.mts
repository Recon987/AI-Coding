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
