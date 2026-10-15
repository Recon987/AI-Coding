import type {
  Data,
  Organization,
  Employee,
  Base,
  Assignment,
} from "../src/types";
export const officeCollections: string[];
export const workTypes: Record<Assignment["workType"], string>;
export const dutyTypes: Record<Assignment["duty"], string>;
export function validDate(value: unknown): boolean;
export function validateOffice(data: Data): Data;
export type OfficeRow = {
  employee: Employee;
  organization?: Organization;
  assignment: Assignment | null;
  base?: Base | null;
};
export function officeRows(
  data: Data,
  date: string,
  organizationId?: string,
): OfficeRow[];
export function officeSummary(
  data: Data,
  date: string,
  organizationId?: string,
): {
  total: number;
  registered: number;
  unregistered: number;
  working: number;
  off: number;
  duty: number;
};
