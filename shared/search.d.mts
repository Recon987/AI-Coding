import type { Call, Control, Data, Event, Note, Page, Patrol, Task } from "../src/types";
export const searchText: {
  patrol(p: Patrol): string;
  control(c: Control): string;
  task(t: Task): string;
  event(e: Event): string;
  note(n: Note): string;
  call(c: Call): string;
};
export function matches(text: string, query: string): boolean;
export function searchRecords(data: Data, query: string): { id: string; page: Page; title: string; text: string }[];
