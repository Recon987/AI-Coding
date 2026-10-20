import type { AxProject, Data } from "../src/types";
export type AxReportFormat = "txt" | "md";
export type AxReportRequest = { projectId: string; format: AxReportFormat };
export const TODO: string;
export const AX_REPORT_FORMATS: Record<AxReportFormat, string>;
/** Throws unless the request names an existing project and a known format, and nothing else. */
export function checkAxReportRequest(data: Data, request: unknown): AxProject;
/** Title made safe for a Windows file name (max 60 characters). */
export function safeFileTitle(title: string): string;
/** The report draft for one project; preview and saved file both use this. */
export function buildAxReport(data: Data, request: AxReportRequest, date: string): { filename: string; content: string };
