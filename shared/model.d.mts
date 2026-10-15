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

export type CoordinateAxis = "latitude" | "longitude";
export type Coordinates = { latitude: number; longitude: number };
export type DmsCoordinate = {
  degrees: number;
  minutes: number;
  seconds: number;
  hemisphere: "N" | "S" | "E" | "W";
};
/** Finite DD pair, latitude ±90 and longitude ±180; throws on invalid input. */
export function validateCoordinates(input: unknown): Coordinates;
/** DMS seconds rounded to 6 decimal places with carry. Zero uses N/E. */
export function decimalToDms(
  value: number,
  axis: CoordinateAxis,
): DmsCoordinate;
export function dmsToDecimal(
  input: DmsCoordinate,
  axis: CoordinateAxis,
): number;
