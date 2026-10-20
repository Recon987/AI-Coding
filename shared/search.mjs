// One search text per record kind, shared by the global search and each screen's
// filter so the two cannot drift apart (TASK-PANEL-01 C1). Pure: no DOM or Electron.
import {
  CONTROL_REASONS,
  formatCoordinates,
  PATROL_KINDS,
  RECURRENCE_LABEL,
  isRecurring,
} from "./model.mjs";
import { AX_SNIPPET_CATEGORIES, AX_STAGES, AX_ZONES } from "./ax.mjs";

const join = (...parts) => parts.filter((p) => p !== undefined && p !== null && p !== "").join(" ");
const coordinates = (c) => (c ? join(formatCoordinates(c), formatCoordinates(c, "dms")) : "");

export const searchText = {
  patrol: (p) =>
    join(
      p.title,
      p.route,
      p.observer,
      p.findings,
      p.action,
      p.zone,
      p.kind && PATROL_KINDS[p.kind],
      ...(p.observations ?? []).map((o) => join(o.type, o.note)),
      coordinates(p.coordinates),
    ),
  control: (c) => join(c.title, c.zone, CONTROL_REASONS[c.reason], c.start, c.end ?? "해제 시까지", c.note),
  task: (t) => join(t.title, t.body, t.assignee, t.destination),
  event: (e) =>
    join(e.title, isRecurring(e) ? join(RECURRENCE_LABEL[e.recurrence], "반복", e.repeatUntil) : ""),
  note: (n) => join(n.title, n.body),
  call: (c) => join(c.title, c.body, c.phone),
  ax: (p) =>
    join(p.title, AX_ZONES[p.zone], AX_STAGES[p.stage], p.manager, p.partner, p.nextMilestone, p.nextMilestoneDate, p.risks, p.notes),
  axSnippet: (s) => join(s.title, AX_SNIPPET_CATEGORIES[s.category], ...s.tags, s.description, s.snippet),
};

/** Case-insensitive substring match; an empty query matches everything. */
export function matches(text, query) {
  return text.toLowerCase().includes(query.trim().toLowerCase());
}

/** Rows for the global search: { id, page, title, text } in a stable kind order;
 *  text is the searchable detail after the title, for the result snippet. */
export function searchRecords(data, query) {
  const rows = [
    ...data.patrols.map((r) => ({ id: r.id, page: "patrol", title: r.title, text: searchText.patrol(r) })),
    ...data.controls.map((r) => ({ id: r.id, page: "controls", title: r.title, text: searchText.control(r) })),
    ...data.tasks.map((r) => ({ id: r.id, page: r.kind, title: r.title, text: searchText.task(r) })),
    ...data.events.map((r) => ({ id: r.id, page: "calendar", title: r.title, text: searchText.event(r) })),
    ...data.notes.map((r) => ({ id: r.id, page: "notes", title: r.title, text: searchText.note(r) })),
    ...data.calls.map((r) => ({ id: r.id, page: "calls", title: r.title, text: searchText.call(r) })),
    ...(data.axProjects ?? []).map((r) => ({ id: r.id, page: "ax", title: r.title, text: searchText.ax(r) })),
    ...(data.axSnippets ?? []).map((r) => ({ id: r.id, page: "ax-snippets", title: r.title, text: searchText.axSnippet(r) })),
  ];
  return rows
    .filter((r) => matches(r.text, query))
    .map(({ id, page, title, text }) => ({ id, page, title, text: text.slice(title.length).trim() }));
}
