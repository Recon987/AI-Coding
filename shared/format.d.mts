/** Formats local calendar dates; YYYY-MM-DD is interpreted without UTC conversion. */
export function formatDate(
  value: string | Date,
  options?: { year?: boolean; weekday?: boolean },
): string;
/** Local 24-hour HH:mm, including 00:00 at midnight. */
export function formatClock(value: string | Date): string;
/** Local date with year and 24-hour time. Invalid inputs return 날짜 확인 필요. */
export function formatTime(value: string | Date): string;
