import { EditorDialog, useEditorDraft } from "./EditorDialog";
import { useRef, useState } from "react";
import {
  calendarItems,
  dayKey,
  holidayName,
  RECURRENCE_LABEL,
} from "../../shared/model.mjs";
import type { Data, Event, EventRecurrence, Page, Save } from "../types";
import { categoryTone, Empty, Field, formatDate, itemClock, localInput, SectionHead, Tag } from "../ui";
import { Icon } from "./Icon";
import { askConfirm, confirmDelete } from "../confirm";
/** "순찰 2 · 인계 1" for chips that do not fit in a month cell. */
function overflowByKind(rest: { category: string }[]) {
  const counts = new Map<string, number>();
  for (const i of rest) counts.set(i.category, (counts.get(i.category) ?? 0) + 1);
  return [...counts].map(([category, n]) => `${category} ${n}`).join(" · ");
}

export function Calendar({
  data,
  save,
  busy,
  navigate,
  initialId,
}: {
  data: Data;
  save: Save;
  busy: boolean;
  navigate: (page: Page, id?: string) => void;
  initialId?: string;
}) {
  const initial = data.events.find((e) => e.id === initialId);
  const requestedDate = initialId?.match(
    /^(?:new|date):(\d{4}-\d{2}-\d{2})$/,
  )?.[1];
  const initialDate =
    requestedDate &&
    Number.isFinite(Date.parse(`${requestedDate}T09:00`)) &&
    dayKey(new Date(`${requestedDate}T09:00`)) === requestedDate
      ? requestedDate
      : undefined;
  const [month, setMonth] = useState(
    () =>
      new Date(
        initial?.at || (initialDate ? `${initialDate}T09:00` : Date.now()),
      ),
  );
  const [selected, setSelected] = useState(
    () => initialDate || dayKey(new Date(initial?.at || Date.now())),
  );
  const blank = (date = selected): Event => ({
    id: "",
    title: "",
    at: new Date(`${date}T09:00`).toISOString(),
    done: false,
  });
  const editor = useEditorDraft<Event>(
    initial || blank(),
    !!initial || initialId === "new" || initialId?.startsWith("new:") === true,
  );
  const { draft, setDraft } = editor;
  const year = month.getFullYear(),
    monthIndex = month.getMonth();
  const start = new Date(year, monthIndex, 1);
  const first = new Date(year, monthIndex, 1 - start.getDay());
  const days = Array.from(
    { length: 42 },
    (_, n) =>
      new Date(first.getFullYear(), first.getMonth(), first.getDate() + n),
  );
  const gridStart = dayKey(days[0]);
  const gridEnd = dayKey(days[days.length - 1]);
  const rangeStart = selected < gridStart ? selected : gridStart;
  const rangeEnd = selected > gridEnd ? selected : gridEnd;
  const items = calendarItems(data, {
    startDate: rangeStart,
    endDate: rangeEnd,
  });
  const selectedItems = items.filter(
    (i) => dayKey(new Date(i.at)) === selected,
  );
  const selectedHoliday = holidayName(selected);
  // Week (Mon–Sun around the selected day) and 30-day list views (TASK-CALENDAR-03).
  const [view, setView] = useState<"month" | "week" | "list">("month");
  const shift = (date: string, days: number) => {
    const next = new Date(`${date}T12:00:00`);
    next.setDate(next.getDate() + days);
    return dayKey(next);
  };
  const weekStart = shift(selected, -((new Date(`${selected}T12:00:00`).getDay() + 6) % 7));
  const weekDays = Array.from({ length: 7 }, (_, n) => shift(weekStart, n));
  const listEnd = shift(selected, 29);
  const viewItems =
    view === "month"
      ? []
      : calendarItems(data, {
          startDate: view === "week" ? weekStart : selected,
          endDate: view === "week" ? weekDays[6] : listEnd,
        });
  const byDay = (key: string) => viewItems.filter((i) => dayKey(new Date(i.at)) === key);
  function moveView(direction: 1 | -1) {
    if (view === "month") {
      setMonth(new Date(year, monthIndex + direction, 1));
      return;
    }
    const next = shift(selected, direction * (view === "week" ? 7 : 30));
    setSelected(next);
    setMonth(new Date(`${next}T12:00:00`));
  }
  const unit = view === "month" ? "달" : view === "week" ? "주" : "30일";
  const short = (key: string) => formatDate(key, { year: false, weekday: false });
  const heading =
    view === "month"
      ? `${year}년 ${monthIndex + 1}월`
      : view === "week"
        ? `${short(weekStart)} ~ ${short(weekDays[6])} 주간`
        : `${short(selected)}부터 30일`;
  const agenda = useRef<HTMLElement>(null);
  const focusAgenda = () => {
    agenda.current?.scrollIntoView({ block: "start", behavior: "auto" });
    agenda.current?.focus({ preventScroll: true });
  };
  function choose(date: string) {
    setSelected(date);
    if (window.matchMedia("(max-width: 960px)").matches)
      requestAnimationFrame(focusAgenda);
  }
  const draftStartDay = dayKey(new Date(draft.at));
  const activeRecurrence = draft.recurrence && draft.recurrence !== "none";
  const invalidRepeatUntil =
    Boolean(activeRecurrence) &&
    Boolean(draft.repeatUntil) &&
    draft.repeatUntil! < draftStartDay;
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (invalidRepeatUntil) return;
    const recFields =
      draft.recurrence && draft.recurrence !== "none"
        ? {
            recurrence: draft.recurrence,
            repeatUntil: draft.repeatUntil || null,
          }
        : {};
    const row: Event = {
      id: draft.id || crypto.randomUUID(),
      title: draft.title.trim(),
      at: draft.at,
      done: draft.done,
      ...recFields,
    };
    if (!row.title) return;
    if (
      await save({
        ...data,
        events: draft.id
          ? data.events.map((x) => (x.id === draft.id ? row : x))
          : [...data.events, row],
      })
    ) {
      editor.finishEditor();
      setSelected(dayKey(new Date(row.at)));
      setMonth(new Date(row.at));
    } else
      editor.setSaveError(
        "저장하지 못했습니다. 입력 내용은 유지됩니다. 다시 시도하세요.",
      );
  }
  return (
    <div className={`calendar-layout ${view === "month" ? "" : "wide"}`}>
      <section className="panel">
        <SectionHead
          eyebrow="CONNECTED CALENDAR"
          title={heading}
        >
          <div className="month-controls">
            {view === "month" && (
              <button onClick={focusAgenda}>
                선택 날짜 기록 {selectedItems.length}건 보기
              </button>
            )}
            <button
              className="primary"
              disabled={busy}
              onClick={() => editor.openEditor(blank())}
            >
              일정 추가
            </button>
            <button aria-label={`이전 ${unit}`} onClick={() => moveView(-1)}>
              ←
            </button>
            <button
              onClick={() => {
                setMonth(new Date());
                choose(dayKey());
              }}
            >
              오늘
            </button>
            <button aria-label={`다음 ${unit}`} onClick={() => moveView(1)}>
              →
            </button>
          </div>
        </SectionHead>
        <div className="segmented calendar-views" role="tablist" aria-label="달력 보기">
          {(
            [
              ["month", "월간"],
              ["week", "주간"],
              ["list", "목록"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={view === key}
              className={view === key ? "selected" : ""}
              onClick={() => setView(key)}
            >
              {label}
            </button>
          ))}
        </div>
        {view === "week" && (
          <div className="week-view">
            {weekDays.map((key) => {
              const entries = byDay(key);
              const closures = entries.filter((i) => i.category === "통제");
              const holiday = holidayName(key);
              return (
                <section key={key} className={`week-column ${key === selected ? "selected-day" : ""} ${key === dayKey() ? "is-today" : ""}`} aria-label={`${formatDate(key)} ${entries.length}건`}>
                  <button className="week-column-head" aria-pressed={key === selected} onClick={() => choose(key)}>
                    <span>{formatDate(key, { year: false })}</span>
                    {holiday && <small className="holiday-label">{holiday}</small>}
                  </button>
                  {closures.length > 0 && (
                    <span className="calendar-control-mark" title={closures.map((c) => c.title).join(", ")}>
                      <Icon name="controls" size={12} />
                      통제 {closures.length}
                    </span>
                  )}
                  {entries
                    .filter((i) => i.category !== "통제")
                    .map((i) => (
                      <button
                        key={i.key}
                        className={`week-item ${categoryTone(i.category)} ${i.done ? "done" : ""}`}
                        title={`${i.category} · ${itemClock(i)} · ${i.title}`}
                        onClick={() => navigate(i.page as Page, i.id)}
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
        )}
        {view === "list" && (
          <div className="list-view">
            {Array.from({ length: 30 }, (_, n) => shift(selected, n))
              .filter((key) => byDay(key).length > 0)
              .map((key) => (
                <section key={key} className="list-view-day">
                  <h3>
                    {formatDate(key)}
                    {holidayName(key) && <Tag tone="holiday">{holidayName(key)}</Tag>}
                  </h3>
                  {byDay(key).map((i) => (
                    <button key={i.key} className="list-view-row" onClick={() => navigate(i.page as Page, i.id)}>
                      <time>{itemClock(i)}</time>
                      <Tag tone={categoryTone(i.category)}>{i.category}</Tag>
                      <span className={i.done ? "done" : ""}>{i.title}</span>
                    </button>
                  ))}
                </section>
              ))}
            {viewItems.length === 0 && <Empty>이 기간에 기록이 없습니다.</Empty>}
          </div>
        )}
        {view === "month" && (
        <>
        <div className="calendar-legend">
          <Tag><Icon name="calendar" size={12} />일정</Tag>
          <Tag tone="patrol"><Icon name="patrol" size={12} />순찰</Tag>
          <Tag tone="task"><Icon name="handover" size={12} />인계</Tag>
          <Tag tone="task"><Icon name="submission" size={12} />제출</Tag>
          <Tag tone="control"><Icon name="controls" size={12} />통제</Tag>
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
            const entryDescription = work.slice(0, 3).map((i) =>
              `${i.category} ${itemClock(i)} ${i.title}${i.done ? " 완료" : ""}`,
            ).join(", ");
            return (
              <button
                key={key}
                aria-label={`${key} ${work.length}건, ${formatDate(key)}${holiday ? `, ${holiday}` : ""}${closures.length ? `, 탐방로 통제 ${closures.length}곳` : ""}${entryDescription ? `, ${entryDescription}` : ""}${work.length > 3 ? `, 그 외 ${work.length - 3}건. 선택 날짜 기록에서 전체 확인` : ""}`}
                aria-pressed={selected === key}
                aria-current={key === dayKey() ? "date" : undefined}
                className={`calendar-day ${date.getMonth() !== monthIndex ? "outside" : ""} ${key === selected ? "selected-day" : ""} ${holiday ? "holiday-day" : ""} ${date.getDay() === 0 ? "sunday" : date.getDay() === 6 ? "saturday" : ""}`}
                onClick={() => choose(key)}
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
                    <span>{i.recurrence && i.recurrence !== "none" ? "↻ " : ""}{i.title}</span>
                  </span>
                ))}
                {work.length > 3 && (
                  <small title={overflowByKind(work.slice(3))}>+{work.length - 3}건</small>
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
        </>
        )}
      </section>
      <div className="calendar-detail" hidden={view !== "month"}>
        <section
          className="panel calendar-agenda"
          ref={agenda}
          tabIndex={-1}
          aria-label="선택 날짜 기록"
        >
          <SectionHead title={formatDate(selected)}>
            {selectedHoliday && <Tag tone="holiday">{selectedHoliday}</Tag>}
          </SectionHead>
          <p className="agenda-caption">선택 날짜 기록 <strong>{selectedItems.length}건</strong></p>
          {selectedItems.length === 0 && (
            <Empty>선택한 날짜에 기록이 없습니다.</Empty>
          )}
          {selectedItems.map((i) => (
            <div className="agenda-row" key={i.key}>
              <Tag tone={categoryTone(i.category)}>
                {i.category}
              </Tag>
              <div>
                <button
                  className={`link-button ${i.done ? "done" : ""}`}
                  onClick={() =>
                    i.page === "calendar"
                      ? editor.openEditor(
                          data.events.find((e) => e.id === i.id)!,
                        )
                      : navigate(i.page as Page, i.id)
                  }
                >
                  {i.title}
                </button>
                <small>
                  <time dateTime={i.at}>{itemClock(i)}</time>
                  {i.recurrence && i.recurrence !== "none"
                    ? ` · ${RECURRENCE_LABEL[i.recurrence]} 반복${i.repeatUntil ? ` (~${i.repeatUntil})` : ""}`
                    : ""}
                </small>
              </div>
              {i.page === "calendar" && (
                <input
                  type="checkbox"
                  aria-label={
                    i.recurrence && i.recurrence !== "none"
                      ? `${i.title} 전체 반복 일정 ${i.done ? "다시 진행" : "완료"}`
                      : `${i.title} 완료`
                  }
                  title={
                    i.recurrence && i.recurrence !== "none"
                      ? "전체 반복 일정의 모든 회차와 알림에 적용합니다."
                      : "일정 완료 상태 변경"
                  }
                  checked={i.done}
                  disabled={busy}
                  onChange={async () => {
                    if (
                      i.recurrence &&
                      i.recurrence !== "none" &&
                      !(await askConfirm(
                        i.done
                          ? {
                              message: "전체 반복 일정을 다시 진행 상태로 바꾸고 알림을 재개할까요?",
                              detail: "모든 회차에 적용됩니다.",
                              confirmLabel: "다시 진행",
                            }
                          : {
                              message: "전체 반복 일정의 모든 회차를 완료하고 이후 알림을 중지할까요?",
                              detail: "회차별 완료는 지원하지 않습니다.",
                              confirmLabel: "모두 완료",
                            },
                      ))
                    )
                      return;
                    save({
                      ...data,
                      events: data.events.map((e) =>
                        e.id === i.id ? { ...e, done: !e.done } : e,
                      ),
                    });
                  }}
                />
              )}
            </div>
          ))}
        </section>
        {editor.isOpen && (
          <EditorDialog
            title={draft.id ? "일정 수정" : "일정 등록"}
            busy={busy}
            dirty={editor.dirty}
            onClose={editor.finishEditor}
            error={editor.saveError}
          >
            <form className="editor" onSubmit={submit}>
              <div className="editor-header-actions">
                <button
                  className="primary"
                  disabled={busy || invalidRepeatUntil}
                >
                  {draft.id ? "변경 저장" : "일정 저장"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={editor.closeEditor}
                >
                  취소
                </button>
                {draft.id && (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        if (
                          (await confirmDelete("일정")) &&
                          (await save({
                            ...data,
                            events: data.events.filter(
                              (e) => e.id !== draft.id,
                            ),
                          }))
                        )
                          editor.finishEditor();
                      }}
                    >
                      삭제
                    </button>
                  </>
                )}
              </div>
              <Field label="일정 제목">
                <input
                  required
                  maxLength={500}
                  autoFocus
                  value={draft.title}
                  onChange={(e) =>
                    setDraft({ ...draft, title: e.target.value })
                  }
                />
              </Field>
              <Field label="일정 일시">
                <input
                  type="datetime-local"
                  required
                  value={localInput(draft.at)}
                  onChange={(e) => {
                    if (e.target.value)
                      setDraft({
                        ...draft,
                        at: new Date(e.target.value).toISOString(),
                      });
                  }}
                />
              </Field>

              <div className="form-row">
                <Field label="반복 주기">
                  <select
                    aria-label="반복 주기"
                    value={draft.recurrence || "none"}
                    onChange={(e) => {
                      const next = e.target.value as EventRecurrence;
                      setDraft({
                        ...draft,
                        recurrence: next,
                        repeatUntil: next === "none" ? null : draft.repeatUntil,
                      });
                    }}
                  >
                    {(Object.keys(RECURRENCE_LABEL) as EventRecurrence[]).map(
                      (k) => (
                        <option key={k} value={k}>
                          {RECURRENCE_LABEL[k]}
                        </option>
                      ),
                    )}
                  </select>
                </Field>
                {activeRecurrence && (
                  <Field label="반복 종료일">
                    <input
                      type="date"
                      aria-label="반복 종료일"
                      min={draftStartDay}
                      value={draft.repeatUntil || ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          repeatUntil: e.target.value || null,
                        })
                      }
                    />
                  </Field>
                )}
              </div>
              {invalidRepeatUntil && (
                <p role="alert" className="error">
                  반복 종료일은 일정 시작일({draftStartDay}) 이후여야 합니다.
                </p>
              )}
              <p className="help">앱 실행 중 예정 시각에 알림을 표시합니다.</p>
            </form>
          </EditorDialog>
        )}
      </div>
    </div>
  );
}
