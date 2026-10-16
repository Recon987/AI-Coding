import { useState } from "react";
import {
  briefing,
  calendarItems,
  dayKey,
  formatCoordinates,
  holidayName,
  RECURRENCE_LABEL,
  collections,
  activeControls,
} from "../../shared/model.mjs";
import type { Data, Page } from "../types";
import { formatDate, formatTime, itemClock, SectionHead, Tag } from "../ui";
import { dutyTypes, officeRows, officeSummary } from "../../shared/office.mjs";
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
  const office = officeSummary(data, today);
  // Today's duty staff and closures for the status strip (TASK-HOME-02).
  const dutyToday = officeRows(data, today).filter(
    (r) => r.assignment && r.assignment.duty !== "none",
  );
  const closuresToday = activeControls(data, today);
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
  const weekStart = new Date(`${date}T12:00:00`);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + index);
    return day;
  });
  const items = calendarItems(data, {
    startDate: dayKey(week[0]),
    endDate: dayKey(week[6]),
  });
  const daily = items.filter((i) => dayKey(new Date(i.at)) === date);
  const holiday = holidayName(date);
  function chooseDate(value: string) {
    setDate(value);
    setExpandedDay(false);
  }
  function moveDay(offset: number) {
    const next = new Date(`${date}T12:00:00`);
    next.setDate(next.getDate() + offset);
    chooseDate(dayKey(next));
  }
  const firstUse = collections.every(
    (name) => data[name as Exclude<keyof Data, "version">].length === 0,
  );
  if (firstUse)
    return (
      <section className="start-workspace" aria-label="업무 시작 안내">
        <div className="start-intro">
          <span className="start-mark">
            <Icon name="briefing" size={28} />
          </span>
          <p className="eyebrow">나의 업무 공간</p>
          <h2>오늘의 업무를 시작하세요</h2>
          <p>
            순찰, 일정, 연락, 사무소 근무를 한곳에서 챙기세요.
            <br />
            필요한 기록 하나부터 시작하면 됩니다.
          </p>
        </div>
        <div className="start-actions">
          {(
            [
              ["patrol", "순찰 기록", "현장에서 본 것과 조치를 바로 남기기"],
              ["calendar", "일정 등록", "회의와 마감 시간을 놓치지 않도록"],
              ["calls", "전화메모 작성", "통화 내용과 회신할 일을 빠르게"],
              [
                "office",
                "근무현황판 준비",
                "조직과 직원을 등록하고 근무표 확인",
              ],
            ] as [Page, string, string][]
          ).map(([page, label, description]) => (
            <button
              key={page}
              aria-labelledby={`start-${page}-label`}
              aria-describedby={`start-${page}-description`}
              disabled={busy}
              onClick={() =>
                navigate(page, page === "office" ? undefined : "new")
              }
            >
              <span className="start-action-icon">
                <Icon name={page} size={22} />
              </span>
              <strong id={`start-${page}-label`}>{label}</strong>
              <span id={`start-${page}-description`}>{description}</span>
              <Icon name="arrow" size={17} />
            </button>
          ))}
        </div>
        <p className="start-note">
          이전에 저장한 자료가 있나요? 상단 <strong>자료 관리 → 복원</strong>
          에서 백업 파일을 불러오세요.
        </p>
        <div className="start-features">
          <section>
            <Icon name="calendar" size={19} />
            <div>
              <h3>오늘의 흐름을 한눈에</h3>
              <p>
                등록한 일정과 순찰, 인수인계·제출 기한이 브리핑과 달력에
                모입니다.
              </p>
            </div>
          </section>
          <section>
            <Icon name="search" size={19} />
            <div>
              <h3>쌓인 기록도 빠르게</h3>
              <p>
                기록 검색이나 <kbd>Ctrl K</kbd>로 메모와 업무 내용을 다시
                찾으세요.
              </p>
            </div>
          </section>
        </div>
      </section>
    );
  return (
    <>
      <div className="briefing-toolbar">
        <div className="today-strip" aria-label="오늘 상태">
          <button
            className={`today-tile ${overdue.length ? "danger" : ""}`}
            onClick={() => setFilter("overdue")}
          >
            <span>기한 경과</span>
            <strong>{overdue.length}건</strong>
          </button>
          <button
            className={`today-tile ${dueToday.length ? "warning" : ""}`}
            onClick={() => setFilter("today")}
          >
            <span>오늘 마감</span>
            <strong>{dueToday.length}건</strong>
          </button>
          <button
            className={`today-tile ${closuresToday.length ? "control" : ""}`}
            onClick={() => navigate("controls")}
            aria-label={`오늘 통제 ${closuresToday.length}곳${closuresToday.length ? `: ${closuresToday.map((c) => c.title).join(", ")}` : ""}`}
          >
            <span>오늘 통제</span>
            <strong>{closuresToday.length}곳</strong>
            {closuresToday[0] && (
              <small title={closuresToday.map((c) => c.title).join(" · ")}>
                {closuresToday[0].title}
                {closuresToday.length > 1 && ` 외 ${closuresToday.length - 1}`}
              </small>
            )}
          </button>
          <button
            className="today-tile"
            onClick={() => navigate("office")}
            aria-label={`오늘 당직 ${dutyToday.length ? dutyToday.map((r) => `${dutyTypes[r.assignment!.duty]} ${r.employee.name}`).join(", ") : "등록 없음"}`}
          >
            <span>오늘 당직</span>
            <strong>{dutyToday.length ? `${dutyToday.length}명` : "—"}</strong>
            <small
              title={dutyToday
                .map((r) => `${dutyTypes[r.assignment!.duty]} ${r.employee.name}`)
                .join(" · ")}
            >
              {dutyToday.length
                ? dutyToday
                    .map((r) => `${dutyTypes[r.assignment!.duty]} ${r.employee.name}`)
                    .join(" · ")
                : "등록 없음"}
            </small>
          </button>
        </div>
        <details className="briefing-actions">
          <summary className="primary">
            <Icon name="plus" size={16} />새 기록
          </summary>
          <div>
            {(
              [
                ["calls", "전화메모"],
                ["notes", "업무 메모"],
                ["calendar", "일정"],
                ["patrol", "순찰"],
                ["handover", "인수인계"],
                ["submission", "제출 기한"],
              ] as [Page, string][]
            ).map(([page, label]) => (
              <button
                key={page}
                disabled={busy}
                onClick={() => navigate(page, "new")}
              >
                <Icon name={page} />
                {label}
              </button>
            ))}
          </div>
        </details>
      </div>
      <div className="briefing-main">
        <section className="panel task-overview" aria-label="챙겨야 할 업무">
          <SectionHead title="챙겨야 할 업무">
            <button
              className="text-button"
              disabled={busy}
              onClick={() => navigate("submission", "new")}
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
              <p>
                {filter === "all"
                  ? "인수인계와 제출 기한을 등록하면 이곳에 모입니다."
                  : "다른 진행 중 업무는 전체 목록에서 확인하세요."}
              </p>
              {filter !== "all" && (
                <button
                  className="text-button"
                  onClick={() => setFilter("all")}
                >
                  진행 중 전체 보기
                </button>
              )}
              <button
                disabled={busy}
                onClick={() => navigate("handover", "new")}
              >
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
                    ? "danger"
                    : dayKey(new Date(t.at)) === today
                      ? "warning"
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
        <div className="briefing-rail">
          <section
            className="panel daily-overview"
            aria-label="날짜별 기록"
            id="briefing-daily"
            tabIndex={-1}
          >
            <SectionHead
              title={date === today ? "오늘의 일정과 기록" : `${formatDate(date, { year: false })} 기록`}
            >
              <div className="daily-controls">
                <button aria-label="이전 주" onClick={() => moveDay(-7)}>
                  ‹
                </button>
                <button onClick={() => chooseDate(today)}>오늘</button>
                <button aria-label="다음 주" onClick={() => moveDay(7)}>
                  ›
                </button>
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
              {holiday && <Tag tone="holiday">{holiday}</Tag>}
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
                  <time>{itemClock(row)}</time>
                  <div>
                    <strong className={row.done ? "done" : ""}>
                      {row.title}
                    </strong>
                    <small>
                      {row.category}
                      {row.recurrence && row.recurrence !== "none"
                        ? ` · ${RECURRENCE_LABEL[row.recurrence]} 반복`
                        : ""}
                      {row.done ? " · 완료" : ""}
                    </small>
                    {coordinates && (
                      <small
                        className="coordinate-summary"
                        title={formatCoordinates(coordinates, "dms")}
                      >
                        {formatCoordinates(coordinates)}
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
                  onClick={() => navigate("calendar", `new:${date}`)}
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
          <section className="office-glance" aria-label="오늘의 사무소 근무">
            <div>
              <Icon name="office" />
              <h2>사무소 근무</h2>
              <button
                className="text-button"
                disabled={busy}
                onClick={() => navigate("office")}
              >
                현황판
                <Icon name="arrow" size={14} />
              </button>
            </div>
            {office.total ? (
              <p>
                직원 <strong>{office.total}명</strong> · 근무 등록{" "}
                <strong>{office.registered}명</strong>
                <br />
                당직·숙직 <strong>{office.duty}명</strong> · 미등록{" "}
                <strong>{office.unregistered}명</strong>
              </p>
            ) : (
              <p>
                등록한 직원이 없습니다.{" "}
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => navigate("office")}
                >
                  직원과 근무표 설정
                </button>
              </p>
            )}
          </section>
        </div>
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
