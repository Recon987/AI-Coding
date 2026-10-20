import type { Data, ProjectField, ProjectStage, Reference, ReferenceKind, Source, SourceKind, Project, AxZone, AxStage } from "../src/types";
export const PROJECT_FIELDS: Record<ProjectField, string>;
export const PROJECT_STAGES: Record<ProjectStage, string>;
export const REFERENCE_KINDS: Record<ReferenceKind, string>;
export const SOURCE_KINDS: Record<SourceKind, string>;
export const MAX_PROJECT_RECORDS: number;
export const MAX_REFERENCE_IDS: number;
export function validReferenceIds(value: unknown): value is string[];
export function validateProjects(list: unknown): Project[];
export function validateReferences(list: unknown): Reference[];
export function validateSource(source: unknown): Source | null;
export function validateProjectLinks(data: Partial<Data>): void;
export function projectIdSet(data: Partial<Data>): Set<string>;
export type ProjectView = {
  id: string;
  /** Where the record is edited. */
  store: "projects" | "axProjects";
  title: string;
  field: ProjectField;
  stage: ProjectStage;
  manager: string;
  nextMilestone: string;
  nextMilestoneDate: string | null;
  risks: string;
  notes: string;
  referenceIds: string[];
  updatedAt: string;
  /** Present for AX projects only while the AX module is shown. */
  ext?: { ax: { zone: AxZone; axStage: AxStage; axStageLabel: string; budgetTotal: number; budgetExecuted: number; partner: string } };
};
export function listProjects(data: Partial<Data>, options?: { axEnabled?: boolean }): ProjectView[];
export function projectRef(
  data: Partial<Data>,
  projectId: string | null | undefined,
): null | { exists: true; id: string; title: string; field: ProjectField } | { exists: false; id: string; label: string };
export function sourceView(
  data: Partial<Data>,
  source: Source | null | undefined,
): null | { live: boolean; label: string; page: "notes" | "calls" | "patrol" | "meetings" | null; id: string };
export function referenceView(
  data: Partial<Data>,
  id: string,
):
  | { exists: false; id: string; label: string }
  | { exists: true; id: string; kind: ReferenceKind; kindLabel: string; label: string; targetMissing: boolean; path: string | null; docNo: string | null };
