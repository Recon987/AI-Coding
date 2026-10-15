import type { Data } from "../src/types";
export type ImportKind =
  | "organizations"
  | "employees"
  | "bases"
  | "assignments";
export const importColumns: Record<ImportKind, string[]>;
export function parseCsv(source: string): string[][];
export type ImportPreview = {
  data: Data;
  changes: { line: number; label: string; action: string }[];
  added: number;
  updated: number;
  unchanged: number;
};
export function previewOfficeImport(
  data: Data,
  kind: ImportKind,
  source: string,
  createId?: () => string,
): ImportPreview;
