import {
  dayKey,
  holidayName,
  RECURRENCE_LABEL,
} from "../../../shared/model.mjs";
import type { CalendarItem } from "../../types";
import { categoryTone, formatDate, itemClock } from "../../ui";
import { Icon } from "../Icon";
import { Tag } from "../../ui";

/** "순찰 2 · 인계 1" for chips that do not fit in a month cell. */
function overflowByKind(rest: { category: string }[]) {
  const counts = new Map<string, number>();
  for (const i of rest)
    counts.set(i.category, (counts.get(i.category) ?? 0) + 1);
  return [...counts].map(([category, n]) => `${category} ${n}`).join(" · ");
}

export function MonthGrid({
  days,
  monthIndex,
  items,
  selected,
  onChoose,
}: {
  days: Date[];
  monthIndex: number;
  items: CalendarItem[];
  selected: string;
  onChoose: (date: string) => void;
}) {
  return (
    <div
      id="calendar-panel-month"
      role="tabpanel"
      aria-labelledby="calendar-tab-month"
    >
      <div className="calendar-legend">
        <Tag>
          <Icon name="calendar" size={12} />
          일정
        </Tag>
        <Tag tone="patrol">
          <Icon name="patrol" size={12} />
          순찰
        </Tag>
        <Tag tone="task">
          <Icon name="handover" size={12} />
          인계
        </Tag>
        <Tag tone="task">
          <Icon name="submission" size={12} />
          제출
        </Tag>
        <Tag tone="control">
          <Icon name="controls" size={12} />
          통제
        </Tag>
        <Tag tone="holiday">공휴일</Tag>
      </div>
      <div className="calendar-week">
        {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {days.map((date) => {
          const key = dayKey(date),
            entries = items.filter((i) => dayKey(new Date(i.at)) === key),
            holiday = holidayName(key);
          // Closures can span weeks; they get one marker so work items keep the chip slots.
          const closures = entries.filter((i) => i.category === "통제");
          const work = entries.filter((i) => i.category !== "통제");
          const entryDescription = work
            .slice(0, 3)
            .map(
              (i) =>
                `${i.category} ${itemClock(i)} ${i.title}${i.done ? " 완료" : ""}`,
            )
            .join(", ");
          return (
            <button
              key={key}
              aria-label={`${key} ${work.length}건, ${formatDate(key)}${holiday ? `, ${holiday}` : ""}${closures.length ? `, 탐방로 통제 ${closures.length}곳` : ""}${entryDescription ? `, ${entryDescription}` : ""}${work.length > 3 ? `, 그 외 ${work.length - 3}건. 선택 날짜 기록에서 전체 확인` : ""}`}
              aria-pressed={selected === key}
              aria-current={key === dayKey() ? "date" : undefined}
              className={`calendar-day ${date.getMonth() !== monthIndex ? "outside" : ""} ${key === selected ? "selected-day" : ""} ${holiday ? "holiday-day" : ""} ${date.getDay() === 0 ? "sunday" : date.getDay() === 6 ? "saturday" : ""}`}
              onClick={() => onChoose(key)}
            >
              <div className="day-head">
                <span
                  className={key === dayKey() ? "today-number" : "day-number"}
                >
                  {date.getDate()}
                </span>
                {holiday && (
                  <span className="holiday-label" title={holiday}>
                    {holiday}
                  </span>
                )}
              </div>
              {work.slice(0, 3).map((i) => (
                <span
                  className={`calendar-chip ${categoryTone(i.category)} ${i.done ? "done" : ""}`}
                  key={i.key}
                  title={`${i.category} · ${itemClock(i)} · ${i.title}${i.recurrence && i.recurrence !== "none" ? ` · ${RECURRENCE_LABEL[i.recurrence]} 반복` : ""}${i.done ? " · 완료" : ""}`}
                >
                  <Icon name={i.page} size={12} />
                  <span>
                    {i.recurrence && i.recurrence !== "none" ? "↻ " : ""}
                    {i.title}
                  </span>
                </span>
              ))}
              {work.length > 3 && (
                <small title={overflowByKind(work.slice(3))}>
                  +{work.length - 3}건
                </small>
              )}
              {closures.length > 0 && (
                <span
                  className="calendar-control-mark"
                  title={`탐방로 통제 · ${closures.map((c) => c.title).join(", ")}`}
                >
                  <Icon name="controls" size={12} />
                  통제 {closures.length}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="help">
        순찰과 인계·제출 기한은 원본 기록에서 자동으로 표시됩니다.
        법정공휴일·대체공휴일(오프라인 음력 공휴일 2025~2035년 포함)과 반복
        일정도 복제 없이 함께 표시합니다.
      </p>
    </div>
  );
}
