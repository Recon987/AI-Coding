import type { Data, Zone } from "../src/types";
export const MAX_ZONES: number;
export function validateZones(list: unknown): Zone[];
/** Active zones ordered by code (natural order). */
export function zoneSuggestions(data: Data): Zone[];
export function findZone(data: Data, code: string | null | undefined): Zone | undefined;
/** The zone's route first, then recent patrol routes, unique, at most `limit`. */
export function routeSuggestions(data: Data, zoneCode: string | null | undefined, limit?: number): string[];
