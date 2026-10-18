import { useLayoutEffect, useRef } from "react";
import { addDays, periodRange, validDateKey } from "../../../shared/dates.mjs";
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
  focusDate,
  focusRequest,
  onFocusDate,
  onMoveDate,
  onChoose,
}: {
  days: Date[];
  monthIndex: number;
  items: CalendarItem[];
  selected: string;
  focusDate: string;
  focusRequest: number;
  onFocusDate: (date: string) => void;
  onMoveDate: (date: string) => void;
  onChoose: (date: string, focusRecords?: boolean) => void;
}) {
  const grid = useRef<HTMLDivElement>(null);
  const lastRequest = useRef(focusRequest);
  useLayoutEffect(() => {
    if (lastRequest.current === focusRequest) return;
    lastRequest.current = focusRequest;
    grid.current
      ?.querySelector<HTMLButtonElement>(`[data-date="${focusDate}"]`)
      ?.focus();
  }, [focusDate, focusRequest]);
  function dateKeys(e: React.KeyboardEvent<HTMLButtonElement>, key: string) {
    let next: string;
    const weekday = new Date(`${key}T12:00:00Z`).getUTCDay();
    switch (e.key) {
      case "ArrowLeft":
        next = addDays(key, -1);
        break;
      case "ArrowRight":
        next = addDays(key, 1);
        break;
      case "ArrowUp":
        next = addDays(key, -7);
        break;
      case "ArrowDown":
        next = addDays(key, 7);
        break;
      case "Home":
        next = addDays(key, -weekday);
        break;
      case "End":
        next = addDays(key, 6 - weekday);
        break;
      case "PageUp":
      case "PageDown": {
        const date = new Date(`${key}T12:00:00Z`),
          day = date.getUTCDate();
        date.setUTCDate(1);
        date.setUTCMonth(date.getUTCMonth() + (e.key === "PageUp" ? -1 : 1));
        const first = date.toISOString().slice(0, 10);
        if (!validDateKey(first)) {
          e.preventDefault();
          return;
        }
        const lastDay = Number(periodRange("month", first).endDate.slice(-2));
        next = `${first.slice(0, 8)}${String(Math.min(day, lastDay)).padStart(2, "0")}`;
        break;
      }
      default:
        return;
    }
    e.preventDefault();
    if (validDateKey(next)) onMoveDate(next);
  }
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
      <div
        className="calendar-month-grid"
        role="grid"
        ref={grid}
        aria-labelledby="calendar-heading"
        aria-describedby="calendar-grid-help"
        aria-rowcount={7}
        aria-colcount={7}
      >
        <div className="calendar-week" role="row">
          {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
            <span role="columnheader" key={d}>
              {d}
            </span>
          ))}
        </div>
        <div className="calendar-grid">
          {Array.from({ length: 6 }, (_, row) => (
            <div className="calendar-grid-row" role="row" key={row}>
              {days.slice(row * 7, row * 7 + 7).map((date) => {
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
                  <div
                    role="gridcell"
                    aria-selected={selected === key}
                    className="calendar-cell"
                    key={key}
                  >
                    <button
                      data-date={key}
                      tabIndex={key === focusDate ? 0 : -1}
                      onFocus={() => onFocusDate(key)}
                      onKeyDown={(e) => dateKeys(e, key)}
                      // Visible day number first, then the full date (TASK-A11Y-02).
                      aria-label={`${date.getDate()}일, ${formatDate(key)}, ${work.length}건${holiday ? `, ${holiday}` : ""}${closures.length ? `, 탐방로 통제 ${closures.length}곳` : ""}${entryDescription ? `, ${entryDescription}` : ""}${work.length > 3 ? `, 그 외 ${work.length - 3}건. 선택 날짜 기록에서 전체 확인` : ""}`}
                      aria-pressed={selected === key}
                      aria-current={key === dayKey() ? "date" : undefined}
                      className={`calendar-day ${date.getMonth() !== monthIndex ? "outside" : ""} ${key === selected ? "selected-day" : ""} ${holiday ? "holiday-day" : ""} ${date.getDay() === 0 ? "sunday" : date.getDay() === 6 ? "saturday" : ""}`}
                      onClick={(e) => onChoose(key, e.detail === 0)}
                    >
                      <div className="day-head">
                        <span
                          className={
                            key === dayKey() ? "today-number" : "day-number"
                          }
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
                            {i.recurrence && i.recurrence !== "none"
                              ? "↻ "
                              : ""}
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
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <p className="help calendar-grid-help" id="calendar-grid-help">
        방향키로 날짜 이동 · Home/End 주 처음/끝 · Page Up/Down 월 이동 ·
        Enter/Space로 선택 날짜 기록 보기
      </p>
      <p className="help">
        순찰과 인계·제출 기한은 원본 기록에서 자동으로 표시됩니다.
        법정공휴일·대체공휴일(오프라인 음력 공휴일 2025~2035년 포함)과 반복
        일정도 복제 없이 함께 표시합니다.
      </p>
    </div>
  );
}
