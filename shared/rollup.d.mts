import type { Data } from "../src/types";
import type { referenceView } from "./projects.mjs";
export const REPORT_TYPES: { weekly: string; project: string; handover: string };
export type ReportType = keyof typeof REPORT_TYPES;
export const REPORT_FORMATS: ("txt" | "md")[];
export type RollupRef = { type: "workItem" | "task" | "meeting" | "patrol" | "project" | "axProject"; id: string };
export type RollupItem = {
  ref: RollupRef;
  kind: string;
  title: string;
  /** Local date key: completion day (done), due day (open/next), meeting or milestone day. */
  date: string | null;
  status?: string;
  due?: string;
  overdue?: boolean;
  owner?: string;
  projectId?: string | null;
  projectTitle?: string;
  sources?: string[];
  references?: ReturnType<typeof referenceView>[];
  body?: string;
};
export type Rollup = {
  start: string;
  end: string;
  nextStart: string;
  nextEnd: string;
  projectId: string | null | undefined;
  done: RollupItem[];
  meetings: RollupItem[];
  open: RollupItem[];
  next: RollupItem[];
  patrol: { count: number; attention: number; urgent: number; byKind: Record<string, number>; observations: string; refs: RollupRef[] };
  milestones: RollupItem[];
};
/** Monday–Sunday of the week containing `date`. */
export function weekOf(date: string): { start: string; end: string };
export function collectRollup(
  data: Data,
  range: { start: string; end: string; projectId?: string | null; exclude?: string[] },
  now?: Date,
): Rollup;
export function renderReport(
  type: ReportType,
  data: Data,
  rollup: Rollup,
  options?: { format?: "txt" | "md"; includeBodies?: boolean; includePaths?: boolean; axEnabled?: boolean },
): { title: string; filename: string; content: string };
