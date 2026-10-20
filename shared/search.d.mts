import type { ProjectView } from "./projects.mjs";
import type { Project, Reference, WorkItem, Meeting, AxProject, AxSnippet, Call, Control, Data, Event, Note, Page, Patrol, Task } from "../src/types";
export const searchText: {
  project(p: Project | ProjectView): string;
  reference(r: Reference): string;
  patrol(p: Patrol): string;
  control(c: Control): string;
  work(w: WorkItem): string;
  meeting(m: Meeting): string;
  task(t: Task): string;
  event(e: Event): string;
  note(n: Note): string;
  call(c: Call): string;
  ax(p: AxProject): string;
  axSnippet(s: AxSnippet): string;
};
export function matches(text: string, query: string): boolean;
export function searchRecords(data: Data, query: string): { id: string; page: Page; title: string; text: string }[];
