export const TARGET: {
  work: string;
  meeting: string;
  patrol: string;
  event: string;
  control: string;
  handover: string;
  submission: string;
  note: string;
  call: string;
  assignment: string;
  holiday: string;
  axProject: string;
  axSnippet: string;
};
export const SAVE: string;
export function addLabel(target: string): string;
export function editLabel(target: string): string;
export function editorTitle(target: string, existing: boolean): string;
