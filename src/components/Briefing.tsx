import { useState } from "react";
import {
  briefing,
  calendarItems,
  dayKey,
  formatCoordinates,
} from "../../shared/model.mjs";
import type { Data, Page } from "../types";
import { formatTime, SectionHead, Tag } from "../ui";
import { Icon } from "./Icon";

export function Briefing({
  data,
  navigate,
  busy,
}: {
  data: Data;
  navigate: (page: Page, id?: string) => void;
  busy: boolean;
}) {
  const today = dayKey();
  const [date, setDate] = useState(today);
  const [message, setMessage] = useState("");
  const [showText, setShowText] = useState(false);
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState(false);
  const [expandedDay, setExpandedDay] = useState(false);
  const tasks = data.tasks
    .filter((t) => !t.done)
    .sort(
      (a, b) =>
        Date.parse(a.at) - Date.parse(b.at) ||
        Number(b.priority === "high") - Number(a.priority === "high"),
    );
  const overdue = tasks.filter((t) => Date.parse(t.at) < Date.now());
  const dueToday = tasks.filter((t) => dayKey(new Date(t.at)) === today);
  const calls = data.calls.filter((c) => !c.done);
  const rows =
    filter === "overdue" ? overdue : filter === "today" ? dueToday : tasks;
  const items = calendarItems(data);
  const daily = items.filter((i) => dayKey(new Date(i.at)) === date);
  const weekStart = new Date(`${date}T12:00:00`);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + index);
    return day;
  });
  function chooseDate(value: string) {
    setDate(value);
    setExpandedDay(false);
  }
  function moveDay(offset: number) {
    const next = new Date(`${date}T12:00:00`);
    next.setDate(next.getDate() + offset);
    chooseDate(dayKey(next));
  }
  return (
    <>
      <section className="quick-capture" aria-label="빠른 기록">
        <div>
          <strong>빠른 기록</strong>
          <span>필요한 업무부터 바로 시작하세요.</span>
        </div>
        <div className="quick-capture-actions">
          {(
            [
              ["calls", "전화메모 남기기"],
              ["notes", "메모 작성"],
              ["calendar", "일정 등록"],
              ["patrol", "순찰 기록 남기기"],
            ] as [Page, string][]
          ).map(([page, label]) => (
            <button key={page} disabled={busy} onClick={() => navigate(page)}>
              <Icon name={page} />
              {label}
            </button>
          ))}
        </div>
      </section>
      <div className="metrics">
        {[
          {
            label: "기한 지난 업무",
            count: overdue.length,
            icon: "clock",
            tone: "warn",
            action: () => {
              setFilter("overdue");
              setExpanded(false);
            },
          },
          {
            label: "오늘 마감",
            count: dueToday.length,
            icon: "submission",
            tone: "",
            action: () => {
              setFilter("today");
              setExpanded(false);
            },
          },
          {
            label: "진행 중 인수인계",
            count: tasks.filter((t) => t.kind === "handover").length,
            icon: "handover",
            tone: "",
            action: () => navigate("handover"),
          },
          {
            label: "미처리 전화",
            count: calls.length,
            icon: "calls",
            tone: "",
            action: () => navigate("calls"),
          },
        ].map((m) => (
          <button
            disabled={busy}
            className={`metric ${m.tone}`}
            key={m.label}
            onClick={m.action}
          >
            <span className="metric-label">
              <Icon name={m.icon} />
              {m.label}
            </span>
            <strong>
              {m.count}
              <small>건</small>
            </strong>
            <Icon name="arrow" size={16} />
          </button>
        ))}
      </div>
      <div className="briefing-columns">
        <section className="panel task-overview" aria-label="챙겨야 할 업무">
          <SectionHead title="챙겨야 할 업무">
            <button
              className="text-button"
              disabled={busy}
              onClick={() => navigate("submission")}
            >
              <Icon name="plus" size={15} />
              제출 기한 등록
            </button>
          </SectionHead>
          <div className="segmented dashboard-filters">
            {[
              ["all", "진행 중", tasks.length],
              ["overdue", "기한 경과", overdue.length],
              ["today", "오늘 마감", dueToday.length],
            ].map(([value, label, count]) => (
              <button
                key={value}
                aria-pressed={filter === value}
                className={filter === value ? "selected" : ""}
                onClick={() => {
                  setFilter(String(value));
                  setExpanded(false);
                }}
              >
                {label}
                <span>{count}</span>
              </button>
            ))}
          </div>
          {!rows.length && (
            <div className="dashboard-empty">
              <Icon name="check" size={28} />
              <strong>
                {filter === "overdue"
                  ? "기한을 넘긴 업무가 없습니다."
                  : filter === "today"
                    ? "오늘 마감할 업무가 없습니다."
                    : "아직 등록한 업무가 없습니다."}
              </strong>
              <p>인수인계와 제출 기한을 등록하면 이곳에 모입니다.</p>
              <button disabled={busy} onClick={() => navigate("handover")}>
                <Icon name="plus" size={15} />
                인수인계 등록
              </button>
            </div>
          )}
          {(expanded ? rows : rows.slice(0, 5)).map((t) => (
            <button
              className="work-line"
              key={t.id}
              disabled={busy}
              onClick={() => navigate(t.kind, t.id)}
            >
              <span className={`task-type-icon ${t.kind}`}>
                <Icon name={t.kind} />
              </span>
              <div>
                <span className="work-kind">
                  {t.kind === "submission" ? "제출" : "인수인계"} ·{" "}
                  {t.assignee || "담당 미지정"}
                  {t.destination ? ` · ${t.destination}` : ""}
                </span>
                <strong>{t.title}</strong>
                <small>{formatTime(t.at)} 마감</small>
              </div>
              <Tag
                tone={
                  Date.parse(t.at) < Date.now()
                    ? "red"
                    : dayKey(new Date(t.at)) === today
                      ? "amber"
                      : ""
                }
              >
                {Date.parse(t.at) < Date.now()
                  ? "기한 경과"
                  : dayKey(new Date(t.at)) === today
                    ? "오늘 마감"
                    : t.priority === "high"
                      ? "우선 처리"
                      : "예정"}
              </Tag>
              <Icon name="arrow" size={15} />
            </button>
          ))}
          {rows.length > 5 && (
            <button
              className="show-more"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "접기" : `${rows.length - 5}건 더 보기`}
            </button>
          )}
        </section>
        <section className="panel daily-overview" aria-label="날짜별 기록">
          <SectionHead
            title={date === today ? "오늘의 일정과 기록" : "선택한 날의 기록"}
          >
            <div className="daily-controls">
              <button aria-label="이전 날짜" onClick={() => moveDay(-1)}>
                ‹
              </button>
              <input
                className="date-picker"
                aria-label="브리핑 날짜"
                type="date"
                required
                value={date}
                onChange={(e) => {
                  if (e.target.value) chooseDate(e.target.value);
                }}
              />
              <button aria-label="다음 날짜" onClick={() => moveDay(1)}>
                ›
              </button>
              <button onClick={() => chooseDate(today)}>오늘</button>
            </div>
          </SectionHead>
          <div className="week-strip" aria-label="주간 날짜 선택">
            {week.map((day) => {
              const key = dayKey(day);
              const count = items.filter(
                (i) => dayKey(new Date(i.at)) === key,
              ).length;
              return (
                <button
                  key={key}
                  aria-label={`${key} 기록 ${count}건`}
                  aria-pressed={date === key}
                  className={`${date === key ? "selected" : ""} ${today === key ? "is-today" : ""}`}
                  onClick={() => chooseDate(key)}
                >
                  <span>
                    {day.toLocaleDateString("ko-KR", { weekday: "short" })}
                  </span>
                  <strong>{day.getDate()}</strong>
                  <i className={count ? "has-record" : ""} />
                </button>
              );
            })}
          </div>
          <div className="day-counts">
            <span>
              일정 <b>{daily.filter((i) => i.category === "일정").length}</b>
            </span>
            <span>
              순찰 <b>{daily.filter((i) => i.category === "순찰").length}</b>
            </span>
            <span>
              인계·제출{" "}
              <b>
                {
                  daily.filter((i) => ["인계", "제출"].includes(i.category))
                    .length
                }
              </b>
            </span>
          </div>
          {(expandedDay ? daily : daily.slice(0, 4)).map((row) => {
            const coordinates =
              row.page === "patrol"
                ? data.patrols.find((p) => p.id === row.id)?.coordinates
                : null;
            return (
              <button
                className="timeline-row"
                key={row.key}
                disabled={busy}
                onClick={() => navigate(row.page as Page, row.id)}
              >
                <time>
                  {new Date(row.at).toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}
                </time>
                <div>
                  <strong className={row.done ? "done" : ""}>
                    {row.title}
                  </strong>
                  <small>
                    {row.category}
                    {row.done ? " · 완료" : ""}
                  </small>
                  {coordinates && (
                    <small className="coordinate-summary">
                      {formatCoordinates(coordinates)} |{" "}
                      {formatCoordinates(coordinates, "dms")}
                    </small>
                  )}
                </div>
                <Icon name="arrow" size={14} />
              </button>
            );
          })}
          {!daily.length && (
            <div className="daily-empty">
              <Icon name="calendar" size={24} />
              <p>이 날짜에 등록된 일정과 기록이 없습니다.</p>
              <button
                className="text-button"
                disabled={busy}
                onClick={() => navigate("calendar")}
              >
                달력에서 일정 등록
                <Icon name="arrow" size={14} />
              </button>
            </div>
          )}
          {daily.length > 4 && (
            <button
              className="show-more"
              onClick={() => setExpandedDay(!expandedDay)}
            >
              {expandedDay ? "접기" : `${daily.length - 4}건 더 보기`}
            </button>
          )}
          <div className="report-actions">
            <button onClick={() => setShowText(!showText)}>
              {showText ? "브리핑 닫기" : "브리핑 미리보기"}
            </button>
            <button
              disabled={!window.workdesk || busy}
              onClick={async () => {
                try {
                  if (await window.workdesk?.exportBriefing(date))
                    setMessage("브리핑을 텍스트 파일로 저장했습니다.");
                } catch {
                  setMessage(
                    "브리핑을 저장하지 못했습니다. 파일 권한을 확인하세요.",
                  );
                }
              }}
            >
              <Icon name="download" size={15} />
              텍스트로 내보내기
            </button>
          </div>
        </section>
      </div>
      {message && (
        <p role="status" className="notice report-message">
          {message}
        </p>
      )}
      {showText && (
        <section className="panel report-preview">
          <h2>업무 브리핑 미리보기</h2>
          <pre>{briefing(data, date)}</pre>
        </section>
      )}
      <div className="personal-overview">
        <section className="panel">
          <SectionHead title="회신할 전화">
            <Tag>{calls.length}건</Tag>
          </SectionHead>
          {calls.slice(0, 3).map((c) => (
            <button
              className="personal-line"
              key={c.id}
              disabled={busy}
              onClick={() => navigate("calls", c.id)}
            >
              <span className="task-type-icon">
                <Icon name="calls" />
              </span>
              <div>
                <strong>{c.title}</strong>
                <small>
                  {c.phone || "전화번호 없음"} · {c.body || "전달 내용 없음"}
                </small>
              </div>
              <Icon name="arrow" size={15} />
            </button>
          ))}
          {!calls.length && (
            <p className="compact-empty">
              미처리 전화가 없습니다. 통화 중에는 빠른 기록을 이용하세요.
            </p>
          )}
          <button
            className="text-button overview-link"
            disabled={busy}
            onClick={() => navigate("calls")}
          >
            전화메모 전체 보기
            <Icon name="arrow" size={14} />
          </button>
        </section>
        <section className="panel">
          <SectionHead title="업무 메모">
            <Tag>{data.notes.length}건</Tag>
          </SectionHead>
          {data.notes.slice(0, 3).map((n) => (
            <button
              className="personal-line"
              key={n.id}
              disabled={busy}
              onClick={() => navigate("notes", n.id)}
            >
              <span className="task-type-icon note">
                <Icon name="notes" />
              </span>
              <div>
                <strong>{n.title}</strong>
                <small>{n.body || "내용 없음"}</small>
              </div>
              <Icon name="arrow" size={15} />
            </button>
          ))}
          {!data.notes.length && (
            <p className="compact-empty">
              확인할 사항과 자주 찾는 내용을 메모해 두세요.
            </p>
          )}
          <button
            className="text-button overview-link"
            disabled={busy}
            onClick={() => navigate("notes")}
          >
            업무 메모 전체 보기
            <Icon name="arrow" size={14} />
          </button>
        </section>
      </div>
    </>
  );
}
