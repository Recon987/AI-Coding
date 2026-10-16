import type { Coordinates } from "../shared/model.mjs";
export type EventRecurrence =
  | "none"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly";
export type Note = { id: string; title: string; body: string };
export type Event = {
  id: string;
  title: string;
  at: string;
  done: boolean;
  recurrence?: EventRecurrence;
  repeatUntil?: string | null;
};
export type Call = Note & { phone: string; done: boolean };
export type Folder = { id: string; title: string; path: string };
export type PatrolKind =
  | "safety"
  | "resource"
  | "enforcement"
  | "fire"
  | "facility"
  | "incident"
  | "general";
/** One counted finding (e.g. 샛길 출입 2건). Never holds personal details or fine amounts. */
export type Observation = {
  id: string;
  type: string;
  count: number;
  outcome: "guidance" | "fine" | "other";
  coordinates?: Coordinates | null;
  note: string;
};
export type Patrol = {
  coordinates?: Coordinates | null;
  kind?: PatrolKind | null;
  /** 담당구역 번호 */
  zone?: string | null;
  observations?: Observation[];
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
/** 탐방로 통제: local dates; end null means until lifted. */
export type Control = {
  id: string;
  title: string;
  zone: string | null;
  reason: "fire" | "weather" | "construction" | "resource" | "other";
  start: string;
  end: string | null;
  note: string;
};
export type Organization = {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
};
export type Employee = {
  id: string;
  code: string;
  name: string;
  organizationId: string;
  position: string;
  active: boolean;
};
export type Base = {
  id: string;
  code: string;
  name: string;
  organizationId: string;
};
export type Assignment = {
  id: string;
  employeeId: string;
  date: string;
  workType: "work" | "off" | "leave" | "trip" | "base";
  duty: "none" | "day" | "night";
  baseId: string | null;
  note: string;
};
export type Data = {
  version: 3;
  notes: Note[];
  events: Event[];
  calls: Call[];
  folders: Folder[];
  patrols: Patrol[];
  tasks: Task[];
  controls: Control[];
  organizations: Organization[];
  employees: Employee[];
  bases: Base[];
  assignments: Assignment[];
};
export type Page =
  | "office"
  | "briefing"
  | "patrol"
  | "controls"
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
  recurrence?: EventRecurrence;
  repeatUntil?: string | null;
  occurrenceDate?: string;
};
export type HolidayEntry = {
  date: string;
  name: string;
  substitute: boolean;
};
export type DesktopSettings = {
  version: 1;
  closeToTray: boolean;
  trayAvailable: boolean;
  message?: string;
};
declare global {
  interface Window {
    workdesk?: {
      getDesktopSettings(): Promise<DesktopSettings>;
      setCloseToTray(enabled: boolean): Promise<DesktopSettings>;
      load(): Promise<Data>;
      save(data: Data): Promise<void>;
      chooseFolder(): Promise<string | null>;
      openFolder(id: string): Promise<void>;
      backup(): Promise<void>;
      restore(): Promise<Data | null>;
      exportBriefing(date: string): Promise<boolean>;
      exportForm(
        request: import("../shared/forms.mjs").FormRequest,
      ): Promise<boolean>;
    };
  }
}
