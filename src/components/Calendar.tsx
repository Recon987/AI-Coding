import { EditorDialog, useEditorDraft } from "./EditorDialog";
import { useRef, useState } from "react";
import { addDays, weekDays as weekOf } from "../../shared/dates.mjs";
import {
  calendarItems,
  expandEventOccurrences,
  setOccurrenceDone,
  setOccurrenceExcluded,
  dayKey,
  holidayName,
  RECURRENCE_LABEL,
  isRecurring,
  LUNAR_TABLE_YEARS,
  recurrenceText,
} from "../../shared/model.mjs";
import type {
  CalendarItem,
  Data,
  Event,
  EventRecurrence,
  Page,
  Save,
} from "../types";
import {
  categoryTone,
  Empty,
  Field,
  focusFirstInvalid,
  formatDate,
  itemClock,
  localInput,
  SectionHead,
  Tag,
} from "../ui";
import { MonthGrid } from "./calendar/MonthGrid";
import { WeekView } from "./calendar/WeekView";
import { ListView } from "./calendar/ListView";
import { askConfirm, confirmDelete } from "../confirm";
import { addLabel, editorTitle, SAVE, TARGET } from "../../shared/labels.mjs";
type View = "month" | "week" | "list";
const VIEWS: [View, string][] = [
  ["month", "월간"],
  ["week", "주간"],
  ["list", "목록"],
];

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
  const occurrenceRequest = initialId?.match(
    /^occurrence:(\d{4}-\d{2}-\d{2}):(.+)$/,
  );
  const initial =
    data.events.find((e) => e.id === initialId) ||
    data.events.find((e) => e.id === occurrenceRequest?.[2]);
  const requestedDate =
    occurrenceRequest?.[1] ||
    initialId?.match(/^(?:new|date):(\d{4}-\d{2}-\d{2})$/)?.[1];
  const initialDate =
    requestedDate &&
    Number.isFinite(Date.parse(`${requestedDate}T09:00`)) &&
    dayKey(new Date(`${requestedDate}T09:00`)) === requestedDate
      ? requestedDate
      : undefined;
  const [month, setMonth] = useState(
    () =>
      new Date(
        initialDate ? `${initialDate}T09:00` : initial?.at || Date.now(),
      ),
  );
  const [selected, setSelected] = useState(
    () => initialDate || dayKey(new Date(initial?.at || Date.now())),
  );
  const [cursor, setCursor] = useState(selected);
  const [gridFocusRequest, setGridFocusRequest] = useState(0);
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
  const [actionError, setActionError] = useState("");
  const [exceptionId, setExceptionId] = useState("");
  const [exceptionLimit, setExceptionLimit] = useState(50);
  const exceptionPanel = useRef<HTMLDetailsElement>(null);
  const excludedEvents = data.events.filter((e) => e.excludedDates?.length);
  const exceptionEvent =
    excludedEvents.find((e) => e.id === exceptionId) || excludedEvents[0];
  const exceptionCount = excludedEvents.reduce(
    (n, e) => n + (e.excludedDates?.length || 0),
    0,
  );
  const occurrenceDay = (item: CalendarItem) =>
    item.occurrenceDate || dayKey(new Date(item.at));
  async function persistEvent(next: Event) {
    setActionError("");
    if (editor.isOpen && editor.dirty) {
      editor.setSaveError(
        "작성 중인 변경을 먼저 저장하거나 취소한 뒤 회차를 변경하세요.",
      );
      return false;
    }
    const ok = await save({
      ...data,
      events: data.events.map((e) => (e.id === next.id ? next : e)),
    });
    if (!ok) {
      const message =
        "회차 변경을 저장하지 못했습니다. 기존 상태를 유지합니다.";
      setActionError(message);
      if (editor.isOpen) editor.setSaveError(message);
      return false;
    }
    if (editor.isOpen && draft.id === next.id) await editor.openEditor(next);
    return true;
  }
  async function toggleDone(item: CalendarItem) {
    const event = data.events.find((e) => e.id === item.id);
    if (!event || busy) return;
    try {
      if (!isRecurring(event))
        await persistEvent({ ...event, done: !event.done });
      else if (event.done) {
        if (
          await askConfirm({
            message: "기존 전체 완료 상태를 해제할까요?",
            detail:
              "앞으로 회차별로 완료할 수 있습니다. 이미 저장한 회차별 완료 기록은 유지합니다.",
            confirmLabel: "전체 완료 해제",
          })
        )
          await persistEvent({ ...event, done: false });
      } else
        await persistEvent(
          setOccurrenceDone(event, occurrenceDay(item), !item.done),
        );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "회차를 변경하지 못했습니다.";
      setActionError(message);
      if (editor.isOpen) editor.setSaveError(message);
    }
  }
  async function excludeOccurrence(
    event: Event,
    date: string,
    excluded: boolean,
  ) {
    if (busy) return;
    if (editor.isOpen && editor.dirty) {
      editor.setSaveError("작성 중인 변경을 먼저 저장하거나 취소하세요.");
      return;
    }
    if (
      excluded &&
      !(await askConfirm({
        message: `${formatDate(date)}의 '${event.title}' 회차를 제외할까요?`,
        detail:
          "다른 날짜는 유지합니다. 이 날짜의 달력·브리핑·알림에서 빠지며 '제외 회차 관리'에서 되돌릴 수 있습니다.",
        confirmLabel: "이 회차 제외",
      }))
    )
      return;
    try {
      if (await persistEvent(setOccurrenceExcluded(event, date, excluded))) {
        setExceptionId(event.id);
        setExceptionLimit(50);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "제외일을 변경하지 못했습니다.";
      setActionError(message);
      if (editor.isOpen) editor.setSaveError(message);
    }
  }
  async function openItem(item: CalendarItem) {
    if (item.page !== "calendar") {
      navigate(item.page as Page, item.id);
      return;
    }
    const source = data.events.find((e) => e.id === item.id);
    if (source && (await editor.openEditor(source))) {
      const date = occurrenceDay(item);
      setSelected(date);
      setCursor(date);
      setMonth(new Date(`${date}T12:00:00`));
      setActionError("");
    }
  }
  function completionControls(item: CalendarItem) {
    const event = data.events.find((e) => e.id === item.id);
    if (!event) return null;
    const repeating = isRecurring(event);
    const date = occurrenceDay(item);
    return (
      <span className="occurrence-actions">
        <label className="occurrence-completion">
          <input
            type="checkbox"
            checked={item.done}
            disabled={editor.isOpen && editor.dirty}
            aria-disabled={busy || undefined}
            aria-label={
              repeating
                ? event.done
                  ? `${item.title} 전체 완료 해제`
                  : `${item.title} ${date} 회차 완료`
                : `${item.title} 완료`
            }
            title={
              repeating
                ? event.done
                  ? "기존 자료의 전체 완료 상태를 해제합니다."
                  : "이 날짜 회차만 완료하거나 다시 진행합니다."
                : "일정 완료 상태 변경"
            }
            onChange={() => {
              if (!busy) void toggleDone(item);
            }}
          />
          <span>
            {repeating ? (event.done ? "전체 완료" : "회차 완료") : "완료"}
          </span>
        </label>
        {repeating && (
          <button
            type="button"
            className="text-button"
            disabled={editor.isOpen && editor.dirty}
            aria-disabled={busy || undefined}
            aria-label={`${item.title} ${date} 회차 제외`}
            onClick={() => {
              if (!busy) void excludeOccurrence(event, date, true);
            }}
          >
            이번 회차 제외
          </button>
        )}
      </span>
    );
  }

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
  const items = calendarItems(data, {
    startDate: gridStart,
    endDate: gridEnd,
  });
  // 조회 범위를 따로 제한해 먼 달을 탐색해도 반복 회차 한도에 잘리지 않는다.
  const selectedItems = calendarItems(data, {
    startDate: selected,
    endDate: selected,
  });
  const focusDate =
    cursor >= gridStart && cursor <= gridEnd
      ? cursor
      : selected >= gridStart && selected <= gridEnd
        ? selected
        : dayKey(start);
  function moveGrid(date: string) {
    setCursor(date);
    const next = new Date(`${date}T12:00:00`);
    if (next.getFullYear() !== year || next.getMonth() !== monthIndex)
      setMonth(next);
    setGridFocusRequest((n) => n + 1);
  }
  const selectedHoliday = holidayName(selected, data.customHolidays);
  // Week (Mon–Sun around the selected day) and 30-day list views (TASK-CALENDAR-03).
  const [view, setView] = useState<View>("month");
  // Arrow/Home/End move between view tabs and select them (roving tabindex).
  function tabKeys(e: React.KeyboardEvent<HTMLButtonElement>) {
    const index = VIEWS.findIndex(([key]) => key === view);
    const target =
      e.key === "ArrowRight"
        ? (index + 1) % VIEWS.length
        : e.key === "ArrowLeft"
          ? (index + VIEWS.length - 1) % VIEWS.length
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? VIEWS.length - 1
              : -1;
    if (target < 0) return;
    e.preventDefault();
    const next = VIEWS[target][0];
    setView(next);
    requestAnimationFrame(() =>
      document.getElementById(`calendar-tab-${next}`)?.focus(),
    );
  }
  const weekDays = weekOf(selected);
  const weekStart = weekDays[0];
  const listEnd = addDays(selected, 29);
  const viewItems =
    view === "month"
      ? []
      : calendarItems(data, {
          startDate: view === "week" ? weekStart : selected,
          endDate: view === "week" ? weekDays[6] : listEnd,
        });
  function moveView(direction: 1 | -1) {
    if (view === "month") {
      const next = new Date(month);
      next.setDate(1);
      next.setMonth(monthIndex + direction);
      setMonth(next);
      setCursor(dayKey(next));
      return;
    }
    const next = addDays(selected, direction * (view === "week" ? 7 : 30));
    setSelected(next);
    setCursor(next);
    setMonth(new Date(`${next}T12:00:00`));
  }
  const unit = view === "month" ? "달" : view === "week" ? "주" : "30일";
  const short = (key: string) =>
    formatDate(key, { year: false, weekday: false });
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
  function choose(date: string, focusRecords = false) {
    setSelected(date);
    setCursor(date);
    if (focusRecords || window.matchMedia("(max-width: 899px)").matches)
      requestAnimationFrame(focusAgenda);
  }
  const draftStartDay = dayKey(new Date(draft.at));
  const activeRecurrence = isRecurring(draft);
  const invalidRepeatUntil =
    Boolean(activeRecurrence) &&
    Boolean(draft.repeatUntil) &&
    draft.repeatUntil! < draftStartDay;
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (invalidRepeatUntil) {
      focusFirstInvalid(e.currentTarget as HTMLFormElement);
      return;
    }
    const existing = data.events.find((e) => e.id === draft.id);
    if (
      existing &&
      !isRecurring(draft) &&
      (existing.completedDates?.length || existing.excludedDates?.length) &&
      !(await askConfirm({
        message: "반복을 해제하고 단일 일정으로 저장할까요?",
        detail:
          "회차별 완료·제외 기록이 제거됩니다. 일정 제목과 시작 시각은 유지합니다.",
        confirmLabel: "반복 해제",
      }))
    )
      return;
    const recFields =
      isRecurring(draft)
        ? {
            recurrence: draft.recurrence,
            repeatUntil: draft.repeatUntil || null,
            ...(draft.completedDates !== undefined
              ? { completedDates: draft.completedDates }
              : {}),
            ...(draft.excludedDates !== undefined
              ? { excludedDates: draft.excludedDates }
              : {}),
          }
        : {};
    // Keep fields this editor does not own; repeat fields come only from recFields.
    const {
      recurrence: _recurrence,
      repeatUntil: _repeatUntil,
      completedDates: _completedDates,
      excludedDates: _excludedDates,
      ...kept
    } = existing ?? {};
    const row: Event = {
      ...kept,
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
      if (!(existing && isRecurring(row) && existing.at === row.at)) {
        setSelected(dayKey(new Date(row.at)));
        setMonth(new Date(row.at));
      }
    } else
      editor.setSaveError(
        "저장하지 못했습니다. 입력 내용은 유지됩니다. 다시 시도하세요.",
      );
  }
  return (
    <div className={`calendar-layout ${view === "month" ? "" : "wide"}`}>
      <header className="calendar-toolbar">
        <div
          className="calendar-navigation"
          role="group"
          aria-label="달력 날짜 이동"
        >
          <button
            onClick={() => {
              setMonth(new Date());
              choose(dayKey());
            }}
          >
            오늘
          </button>
          <button aria-label={`이전 ${unit}`} onClick={() => moveView(-1)}>
            ‹
          </button>
          <button aria-label={`다음 ${unit}`} onClick={() => moveView(1)}>
            ›
          </button>
        </div>
        <h2 id="calendar-heading">{heading}</h2>
        <div className="calendar-actions">
          {exceptionCount > 0 && (
            <button
              type="button"
              onClick={() => {
                if (exceptionPanel.current) {
                  exceptionPanel.current.open = true;
                  exceptionPanel.current.scrollIntoView({ block: "start" });
                }
              }}
            >
              제외 회차 관리 ({exceptionCount})
            </button>
          )}
          <button
            className="primary"
            disabled={busy}
            onClick={() => editor.openEditor(blank())}
          >
            {addLabel(TARGET.event)}
          </button>
        </div>
        <div
          className="segmented calendar-views"
          role="tablist"
          aria-label="달력 보기"
        >
          {VIEWS.map(([key, label]) => (
            <button
              key={key}
              id={`calendar-tab-${key}`}
              role="tab"
              aria-selected={view === key}
              aria-controls={`calendar-panel-${key}`}
              tabIndex={view === key ? 0 : -1}
              className={view === key ? "selected" : ""}
              onClick={() => setView(key)}
              onKeyDown={tabKeys}
            >
              {label}
            </button>
          ))}
        </div>
      </header>
      <section className="panel calendar-view-panel">
        {(() => {
          // TASK-HOLIDAY-01: outside the lunar table, 설·추석·부처님오신날 are missing.
          const shownYear = view === "month" ? year : Number(selected.slice(0, 4));
          return shownYear < LUNAR_TABLE_YEARS.first || shownYear > LUNAR_TABLE_YEARS.last ? (
            <p className="calendar-note" role="note">
              {shownYear}년은 음력 공휴일(설·추석·부처님오신날)이 표에 없습니다. 필요한 날은 자료 관리 → 공휴일 관리에서 등록하세요.
            </p>
          ) : null;
        })()}
        {view === "week" && (
          <WeekView
            customHolidays={data.customHolidays}
            days={weekDays}
            selected={selected}
            items={viewItems}
            onChoose={choose}
            onOpen={openItem}
          />
        )}
        {view === "list" && (
          <ListView startDate={selected} items={viewItems} customHolidays={data.customHolidays} onOpen={openItem} />
        )}
        {view === "month" && (
          <MonthGrid
            customHolidays={data.customHolidays}
            days={days}
            monthIndex={monthIndex}
            items={items}
            selected={selected}
            focusDate={focusDate}
            focusRequest={gridFocusRequest}
            onFocusDate={setCursor}
            onMoveDate={moveGrid}
            onChoose={choose}
          />
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
          <p className="agenda-caption">
            선택 날짜 기록 <strong>{selectedItems.length}건</strong>
          </p>
          {selectedItems.length === 0 && (
            <Empty>선택한 날짜에 기록이 없습니다.</Empty>
          )}
          {selectedItems.map((i) => (
            <div className="agenda-row" key={i.key}>
              <Tag tone={categoryTone(i.category)}>{i.category}</Tag>
              <div>
                <button
                  className={`link-button ${i.done ? "done" : ""}`}
                  onClick={() => void openItem(i)}
                >
                  {i.title}
                </button>
                <small>
                  <time dateTime={i.at}>{itemClock(i)}</time>
                  {isRecurring(i) ? ` · ${recurrenceText(i, { until: true })}` : ""}
                </small>
              </div>
              {i.page === "calendar" && completionControls(i)}
            </div>
          ))}
        </section>
      </div>
      {actionError && (
        <p className="error occurrence-notice" role="alert">
          {actionError}
        </p>
      )}
      {exceptionCount > 0 && (
        <details className="panel excluded-occurrences" ref={exceptionPanel}>
          <summary>제외 회차 관리 ({exceptionCount})</summary>
          <p className="help">
            현재 반복 규칙에 해당하는 날짜는 기록과 알림 대상이 다시 표시됩니다.
            이미 완료한 회차는 완료 상태를 유지합니다.
          </p>
          <Field label="제외 회차가 있는 일정">
            <select
              value={exceptionEvent?.id || ""}
              onChange={(e) => {
                setExceptionId(e.target.value);
                setExceptionLimit(50);
              }}
            >
              {excludedEvents.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
          </Field>
          <ul>
            {exceptionEvent?.excludedDates
              ?.slice()
              .sort()
              .slice(0, exceptionLimit)
              .map((date) => (
                <li key={date}>
                  <time dateTime={date}>{formatDate(date)}</time>
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={`${exceptionEvent.title} ${date} 제외 복원`}
                    onClick={() =>
                      void excludeOccurrence(exceptionEvent, date, false)
                    }
                  >
                    제외 복원
                  </button>
                </li>
              ))}
          </ul>
          {(exceptionEvent?.excludedDates?.length || 0) > exceptionLimit && (
            <button
              type="button"
              onClick={() => setExceptionLimit((n) => n + 50)}
            >
              제외 회차 더 보기
            </button>
          )}
        </details>
      )}
      {editor.isOpen && (
        <EditorDialog
          title={editorTitle(TARGET.event, Boolean(draft.id))}
          busy={busy}
          dirty={editor.dirty}
          onClose={editor.finishEditor}
          error={editor.saveError}
        >
          <form className="editor" onSubmit={submit}>
            {draft.id &&
              activeRecurrence &&
              (() => {
                const source = data.events.find((e) => e.id === draft.id);
                const occurrence =
                  source &&
                  expandEventOccurrences(
                    { ...source, excludedDates: [] },
                    { startDate: selected, endDate: selected },
                  )[0];
                return (
                  <section
                    className="occurrence-editor"
                    aria-label="반복 회차 관리"
                  >
                    <h3>{formatDate(selected)} 회차</h3>
                    <p className="help">
                      완료·제외는 이 날짜에만 반영합니다. 아래 제목·일시·반복
                      주기 변경은 전체 일정에 적용됩니다.
                    </p>
                    {editor.dirty && (
                      <p className="help">
                        작성 중인 내용을 먼저 저장하거나 취소하세요.
                      </p>
                    )}
                    {source?.excludedDates?.includes(selected) ? (
                      <p>
                        제외한 회차입니다. 달력의 제외 회차 관리에서 복원할 수
                        있습니다.
                      </p>
                    ) : occurrence ? (
                      completionControls(occurrence)
                    ) : (
                      <p className="help">
                        선택 날짜에는 이 반복 일정의 회차가 없습니다.
                      </p>
                    )}
                  </section>
                );
              })()}

            <div className="editor-header-actions">
              <button className="primary" disabled={busy}>
                {SAVE}
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
                          events: data.events.filter((e) => e.id !== draft.id),
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
                disabled={busy}
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </Field>
            <Field label="일정 일시">
              <input
                type="datetime-local"
                required
                disabled={busy}
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
                  disabled={busy}
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
                <Field
                  label="반복 종료일"
                  hint="비우면 계속 반복"
                  error={
                    invalidRepeatUntil
                      ? `반복 종료일은 일정 시작일(${draftStartDay})과 같거나 이후여야 합니다.`
                      : undefined
                  }
                >
                  <input
                    type="date"
                    aria-label="반복 종료일"
                    min={draftStartDay}
                    disabled={busy}
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
            <p className="help">앱 실행 중 예정 시각에 알림을 표시합니다.</p>
          </form>
        </EditorDialog>
      )}
    </div>
  );
}
