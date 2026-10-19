import type { AxProject, AxSnippet, AxSnippetCategory, AxStage, AxZone } from "../src/types";
export const AX_ZONES: Record<AxZone, string>;
export const AX_STAGES: Record<AxStage, string>;
export const AX_SNIPPET_CATEGORIES: Record<AxSnippetCategory, string>;
export const MAX_AX_RECORDS: number;
export function validateAxProjects(list: unknown): AxProject[];
export function validateAxSnippets(list: unknown): AxSnippet[];
/** budgetExecuted / budgetTotal, or null when there is no budget. May exceed 1. */
export function executionRate(project: AxProject): number | null;
