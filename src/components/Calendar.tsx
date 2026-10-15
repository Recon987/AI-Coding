import { useState } from "react";
import { calendarItems, dayKey } from "../../shared/model.mjs";
import type { Data, Event, Page, Save } from "../types";
import { Empty, Field, formatTime, localInput, SectionHead, Tag } from "../ui";
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
  const [month, setMonth] = useState(() => new Date(initial?.at || Date.now()));
  const [selected, setSelected] = useState(() =>
    dayKey(new Date(initial?.at || Date.now())),
  );
  const blank = (date = selected): Event => ({
    id: "",
    title: "",
    at: new Date(`${date}T09:00`).toISOString(),
    done: false,
  });
  const [draft, setDraft] = useState<Event>(() => initial || blank());
  const items = calendarItems(data);
  const year = month.getFullYear(),
    monthIndex = month.getMonth();
  const start = new Date(year, monthIndex, 1);
  const first = new Date(year, monthIndex, 1 - start.getDay());
  const days = Array.from(
    { length: 42 },
    (_, n) =>
      new Date(first.getFullYear(), first.getMonth(), first.getDate() + n),
  );
  const selectedItems = items.filter(
    (i) => dayKey(new Date(i.at)) === selected,
  );
  function choose(date: string) {
    setSelected(date);
    setDraft(blank(date));
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const row = {
      ...draft,
      id: draft.id || crypto.randomUUID(),
      title: draft.title.trim(),
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
      setDraft(blank(dayKey(new Date(row.at))));
      setSelected(dayKey(new Date(row.at)));
      setMonth(new Date(row.at));
    }
  }
  return (
    <div className="calendar-layout">
      <section className="panel">
        <SectionHead
          eyebrow="CONNECTED CALENDAR"
          title={`${year}년 ${monthIndex + 1}월`}
        >
          <div className="month-controls">
            <button
              aria-label="이전 달"
              onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}
            >
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
            <button
              aria-label="다음 달"
              onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}
            >
              →
            </button>
          </div>
        </SectionHead>
        <div className="calendar-legend">
          <Tag>일정</Tag>
          <Tag tone="blue">순찰</Tag>
          <Tag tone="amber">인계·제출</Tag>
        </div>
        <div className="calendar-week">
          {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="calendar-grid">
          {days.map((date) => {
            const key = dayKey(date),
              entries = items.filter((i) => dayKey(new Date(i.at)) === key);
            return (
              <button
                key={key}
                aria-label={`${key} ${entries.length}건`}
                aria-pressed={selected === key}
                className={`calendar-day ${date.getMonth() !== monthIndex ? "outside" : ""} ${key === selected ? "selected-day" : ""}`}
                onClick={() => choose(key)}
              >
                <span
                  className={key === dayKey() ? "today-number" : "day-number"}
                >
                  {date.getDate()}
                </span>
                {entries.slice(0, 3).map((i) => (
                  <span
                    className={`calendar-chip ${i.category === "순찰" ? "blue" : i.category === "일정" ? "" : "amber"} ${i.done ? "done" : ""}`}
                    key={i.key}
                  >
                    {i.category} · {i.title}
                  </span>
                ))}
                {entries.length > 3 && <small>+{entries.length - 3}건</small>}
              </button>
            );
          })}
        </div>
        <p className="help">
          순찰과 인계·제출 기한은 원본 기록에서 자동으로 표시됩니다. 공휴일
          정보는 아직 제공하지 않습니다.
        </p>
      </section>
      <div className="calendar-detail">
        <section className="panel">
          <SectionHead
            title={`${selected.slice(5).replace("-", "월 ")}일 기록`}
          />
          {selectedItems.length === 0 && (
            <Empty>선택한 날짜에 기록이 없습니다.</Empty>
          )}
          {selectedItems.map((i) => (
            <div className="agenda-row" key={i.key}>
              <Tag tone={i.category === "순찰" ? "blue" : "amber"}>
                {i.category}
              </Tag>
              <div>
                <button
                  className={`link-button ${i.done ? "done" : ""}`}
                  onClick={() =>
                    i.page === "calendar"
                      ? setDraft(data.events.find((e) => e.id === i.id)!)
                      : navigate(i.page as Page, i.id)
                  }
                >
                  {i.title}
                </button>
                <small>{formatTime(i.at)}</small>
              </div>
              {i.page === "calendar" && (
                <input
                  type="checkbox"
                  aria-label={`${i.title} 완료`}
                  checked={i.done}
                  disabled={busy}
                  onChange={() =>
                    save({
                      ...data,
                      events: data.events.map((e) =>
                        e.id === i.id ? { ...e, done: !e.done } : e,
                      ),
                    })
                  }
                />
              )}
            </div>
          ))}
        </section>
        <form className="panel editor" onSubmit={submit}>
          <SectionHead title={draft.id ? "일정 수정" : "일정 등록"} />
          <Field label="일정 제목">
            <input
              required
              maxLength={500}
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
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
          <div className="form-actions">
            <button className="primary" disabled={busy}>
              {draft.id ? "변경 저장" : "일정 저장"}
            </button>
            {draft.id && (
              <>
                <button type="button" onClick={() => setDraft(blank())}>
                  취소
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    if (
                      confirm("일정을 삭제할까요?") &&
                      (await save({
                        ...data,
                        events: data.events.filter((e) => e.id !== draft.id),
                      }))
                    )
                      setDraft(blank());
                  }}
                >
                  삭제
                </button>
              </>
            )}
          </div>
          <p className="help">앱 실행 중 예정 시각에 알림을 표시합니다.</p>
        </form>
      </div>
    </div>
  );
}
