import { dayKey, holidayName } from "../../../shared/model.mjs";
import type { CalendarItem } from "../../types";
import { categoryTone, formatDate, itemClock } from "../../ui";
import { Icon } from "../Icon";

export function WeekView({
  days,
  selected,
  items,
  onChoose,
  onOpen,
}: {
  days: string[];
  selected: string;
  items: CalendarItem[];
  onChoose: (date: string) => void;
  onOpen: (item: CalendarItem) => void | Promise<void>;
}) {
  const byDay = (date: string) =>
    items.filter((item) => dayKey(new Date(item.at)) === date);
  return (
    <div
      className="week-view"
      id="calendar-panel-week"
      role="tabpanel"
      aria-labelledby="calendar-tab-week"
    >
      {days.map((key) => {
        const entries = byDay(key);
        const closures = entries.filter((i) => i.category === "통제");
        const holiday = holidayName(key);
        return (
          <section
            key={key}
            className={`week-column ${key === selected ? "selected-day" : ""} ${key === dayKey() ? "is-today" : ""}`}
            aria-label={`${formatDate(key)} ${entries.length}건`}
          >
            <button
              className="week-column-head"
              aria-pressed={key === selected}
              onClick={() => onChoose(key)}
            >
              <span>{formatDate(key, { year: false })}</span>
              {holiday && <small className="holiday-label">{holiday}</small>}
            </button>
            {closures.map((c) => (
              <button
                key={c.key}
                className="calendar-control-mark"
                title={`탐방로 통제 · ${c.title}`}
                aria-label={`탐방로 통제 ${c.title} 원본 열기`}
                onClick={() => void onOpen(c)}
              >
                <Icon name="controls" size={12} />
                <span>{c.title}</span>
              </button>
            ))}
            {entries
              .filter((i) => i.category !== "통제")
              .map((i) => (
                <button
                  key={i.key}
                  className={`week-item ${categoryTone(i.category)} ${i.done ? "done" : ""}`}
                  title={`${i.category} · ${itemClock(i)} · ${i.title}`}
                  onClick={() => void onOpen(i)}
                >
                  <time>{itemClock(i)}</time>
                  <span>
                    <Icon name={i.page} size={12} /> {i.title}
                  </span>
                </button>
              ))}
            {entries.length === 0 && <small className="muted">기록 없음</small>}
          </section>
        );
      })}
    </div>
  );
}
