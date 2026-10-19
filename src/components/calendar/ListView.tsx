import { dayKey, holidayName } from "../../../shared/model.mjs";
import type { CalendarItem, CustomHoliday } from "../../types";
import { categoryTone, formatDate, itemClock } from "../../ui";
import { Empty, Tag } from "../../ui";
import { addDays } from "../../../shared/dates.mjs";

export function ListView({
  startDate,
  items,
  customHolidays,
  onOpen,
}: {
  startDate: string;
  items: CalendarItem[];
  customHolidays: CustomHoliday[];
  onOpen: (item: CalendarItem) => void | Promise<void>;
}) {
  const byDay = (date: string) =>
    items.filter((item) => dayKey(new Date(item.at)) === date);
  return (
    <div
      className="list-view"
      id="calendar-panel-list"
      role="tabpanel"
      aria-labelledby="calendar-tab-list"
    >
      {Array.from({ length: 30 }, (_, n) => addDays(startDate, n))
        .filter((key) => byDay(key).length > 0)
        .map((key) => (
          <section key={key} className="list-view-day">
            <h3>
              {formatDate(key)}
              {holidayName(key, customHolidays) && <Tag tone="holiday">{holidayName(key, customHolidays)}</Tag>}
            </h3>
            {byDay(key).map((i) => (
              <button
                key={i.key}
                className="list-view-row"
                onClick={() => void onOpen(i)}
              >
                <time>{itemClock(i)}</time>
                <Tag tone={categoryTone(i.category)}>{i.category}</Tag>
                <span className={i.done ? "done" : ""}>{i.title}</span>
              </button>
            ))}
          </section>
        ))}
      {items.length === 0 && <Empty>이 기간에 기록이 없습니다.</Empty>}
    </div>
  );
}
