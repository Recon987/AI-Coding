import type { Data, CalendarItem } from "../src/types";
import type { ProjectView } from "./projects.mjs";
type FieldValue = { id: string; label: string; value: string };
export const MODULE_CONTRACTS: { id: string; contract: 1; fields: { project(view: ProjectView): FieldValue[] }; deadlines(data: Data, range: { startDate?: string; endDate?: string }): CalendarItem[]; briefing(data: Data, date: string): string[] }[];
export function moduleDeadlines(data: Data, range?: { startDate?: string; endDate?: string }): CalendarItem[];
export function moduleBriefing(data: Data, date: string): string[];
export function projectFields(view: ProjectView): FieldValue[];
