export const TARGET: {
  patrol: string;
  event: string;
  control: string;
  handover: string;
  submission: string;
  note: string;
  call: string;
  assignment: string;
};
export const SAVE: string;
export function addLabel(target: string): string;
export function editLabel(target: string): string;
export function editorTitle(target: string, existing: boolean): string;
