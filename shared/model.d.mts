import type { Data, CalendarItem } from "../src/types";
export const collections: string[];
export function empty(): Data;
export function normalize(input: unknown): Data;
export function dayKey(date?: Date): string;
export function calendarItems(data: Data): CalendarItem[];
export function reminderItems(
  data: Data,
): { id: string; title: string; at: string; done: boolean }[];
export function briefing(data: Data, date: string): string;
