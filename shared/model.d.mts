import type {
  Data,
  CalendarItem,
  Event,
  EventRecurrence,
  HolidayEntry,
  Control,
  Observation,
  PatrolKind,
} from "../src/types";
export const collections: string[];
export const RECURRENCE: EventRecurrence[];
export const RECURRENCE_LABEL: Record<EventRecurrence, string>;
export function empty(): Data;
export function normalize(input: unknown): Data;
export function dayKey(date?: Date): string;
export function holidaysForYear(year: number): HolidayEntry[];
export function holidayName(date: string): string | null;
/** Derives at most 400 occurrences in the requested local-date range without changing the source. */
export function expandEventOccurrences(
  event: Event,
  range?: { startDate?: string; endDate?: string },
): CalendarItem[];
/** Adds only real recurring dates; removes existing history after rule edits. Cannot reopen a globally done series. */
export function setOccurrenceDone(event: Event, date: string, completed: boolean): Event;
/** Returns a copy; exclusions win over completion. Existing historical dates can be removed after rule edits. */
export function setOccurrenceExcluded(event: Event, date: string, excluded: boolean): Event;
export function calendarItems(
  data: Data,
  range?: { startDate?: string; endDate?: string },
): CalendarItem[];
export function reminderItems(
  data: Data,
  now?: number,
): { id: string; title: string; at: string; done: boolean }[];
export function briefing(data: Data, date: string): string;
export const PATROL_KINDS: Record<PatrolKind, string>;
export const OBSERVATION_OUTCOMES: Record<Observation["outcome"], string>;
export const DEFAULT_OBSERVATION_TYPES: string[];
export function observationTypes(data: Data): string[];
export type ObservationSummaryRow = {
  type: string;
  count: number;
  entries: number;
  guidance: number;
  fine: number;
  other: number;
};
export function patrolSummary(
  data: Data,
  range: { startDate: string; endDate: string },
): {
  patrols: number;
  byKind: { kind: PatrolKind | null; label: string; count: number }[];
  observations: ObservationSummaryRow[];
  totalCount: number;
};
export function describeObservations(observations?: Observation[]): string;

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

export function formatCoordinates(
  input: Coordinates,
  format?: "dd" | "dms",
): string;
export const CONTROL_REASONS: Record<Control["reason"], string>;
/** Closures in effect on a local YYYY-MM-DD date, sorted by start. */
export function activeControls(data: Data, date: string): Control[];
