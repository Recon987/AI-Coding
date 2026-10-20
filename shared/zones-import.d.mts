import type { Data } from "../src/types";
import type { ImportPreview } from "./office-import.mjs";
export const ZONE_COLUMNS: string[];
/** Preview of a 담당구역 CSV; throws "N행: 이유" on the first bad row. */
export function previewZoneImport(data: Data, source: string, createId?: () => string): ImportPreview;
