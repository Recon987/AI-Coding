import type { Data } from "../src/types";
export type FormId = "patrol-log" | "enforcement-log";
export type FormFormat = "txt" | "csv";
export type FormRequest = { form: FormId; startDate: string; endDate: string; format: FormFormat };
export const FORMS: Record<FormId, string>;
export const FORM_FORMATS: FormFormat[];
export function csvCell(value: unknown): string;
/** Recommended (not official) form text; content has no BOM. Throws on an invalid request. */
export function buildForm(data: Data, request: FormRequest): { filename: string; content: string };
