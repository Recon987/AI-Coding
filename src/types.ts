export type Note = { id: string; title: string; body: string };
export type Event = { id: string; title: string; at: string; done: boolean };
export type Call = Note & { phone: string; done: boolean };
export type Folder = { id: string; title: string; path: string };
export type Patrol = {
  id: string;
  title: string;
  at: string;
  route: string;
  observer: string;
  findings: string;
  action: string;
  risk: "normal" | "attention" | "urgent";
};
export type Task = Note & {
  kind: "handover" | "submission";
  at: string;
  assignee: string;
  destination: string;
  priority: "normal" | "high";
  remindMinutes: number;
  patrolId: string | null;
  done: boolean;
  completedAt: string | null;
};
export type Data = {
  version: 2;
  notes: Note[];
  events: Event[];
  calls: Call[];
  folders: Folder[];
  patrols: Patrol[];
  tasks: Task[];
};
export type Page =
  | "briefing"
  | "patrol"
  | "handover"
  | "submission"
  | "calendar"
  | "calls"
  | "notes"
  | "folders"
  | "about";
export type Save = (data: Data) => Promise<boolean>;
export type CalendarItem = {
  id: string;
  key: string;
  title: string;
  at: string;
  done: boolean;
  category: string;
  page: string;
};
declare global {
  interface Window {
    workdesk?: {
      load(): Promise<Data>;
      save(data: Data): Promise<void>;
      chooseFolder(): Promise<string | null>;
      openFolder(id: string): Promise<void>;
      backup(): Promise<void>;
      restore(): Promise<Data | null>;
      exportBriefing(date: string): Promise<boolean>;
    };
  }
}
