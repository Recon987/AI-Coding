import type { Data, AxProject, AxSnippet, AxSnippetCategory, AxStage, AxZone } from "../src/types";
export const AX_ZONES: Record<AxZone, string>;
export const AX_STAGES: Record<AxStage, string>;
export const AX_SNIPPET_CATEGORIES: Record<AxSnippetCategory, string>;
export const MAX_AX_RECORDS: number;
export function validateAxProjects(list: unknown): AxProject[];
export function validateAxSnippets(list: unknown): AxSnippet[];
/** budgetExecuted / budgetTotal, or null when there is no budget. May exceed 1. */
export function executionRate(project: AxProject): number | null;
/** "<project> · <milestone text>", or the project name when there is no text. */
export function milestoneTitle(project: AxProject): string;
/** One all-day calendar row per project whose nextMilestoneDate is in the range. */
export function milestoneItems(
  projects?: AxProject[],
  range?: { startDate?: string; endDate?: string },
): {
  id: string;
  title: string;
  at: string;
  key: string;
  category: "AX";
  page: "ax";
  done: boolean;
  zone: AxZone;
  stage: AxStage;
}[];
/** The three built-in example snippets (text only, fixed IDs, `example: true`). */
export const AX_EXAMPLE_SNIPPETS: Omit<AxSnippet, "updatedAt">[];
/** True once the user added the examples; they are never added again automatically. */
export function examplesAdded(data: Data): boolean;
/** Data with the examples added (existing IDs skipped) and the AX module marked. Throws on an unreadable AX setting. */
export function withExampleSnippets(data: Data, now?: string): Data;
