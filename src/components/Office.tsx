import { useState } from "react";
import { dayKey } from "../../shared/model.mjs";
import { formatDate } from "../../shared/format.mjs";
import {
  officeRows,
  officeSummary,
  workTypes,
  dutyTypes,
} from "../../shared/office.mjs";
import type { Assignment, Data, Save } from "../types";
import { Empty, Field, SectionHead, Tag } from "../ui";
import { Icon } from "./Icon";
import { OfficeDirectory } from "./OfficeDirectory";
import { OfficeImport } from "./OfficeImport";
import { Sheet } from "./Sheet";
import { askConfirm, discardChanges } from "../confirm";
const officeTabs = [
  ["board", "근무현황"],
  ["employees", "직원 관리"],
  ["organizations", "조직 관리"],
  ["bases", "거점 관리"],
  ["import", "파일 반입"],
] as const;
type Tab = "board" | "employees" | "organizations" | "bases" | "import";
export function Office({
  data,
  save,
  busy,
}: {
  data: Data;
  save: Save;
  busy: boolean;
}) {
  const [formError, setFormError] = useState("");
  const [tab, setTab] = useState<Tab>("board"),
    [date, setDate] = useState(dayKey()),
    [organizationId, setOrganizationId] = useState(""),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [view, setView] = useState("day"),
    [draft, setDraft] = useState<Assignment | null>(null);
  const rows = officeRows(data, date, organizationId);
  const summary = officeSummary(data, date, organizationId);
  const filtered = rows.filter((r) => {
    const matches =
      `${r.employee.name} ${r.employee.code} ${r.organization?.name}`
        .toLowerCase()
        .includes(query.toLowerCase());
    const status =
      filter === "all" ||
      (filter === "missing"
        ? !r.assignment
        : filter === "duty"
          ? !!r.assignment && r.assignment.duty !== "none"
          : filter === "working"
            ? ["work", "base", "trip"].includes(r.assignment?.workType ?? "")
            : ["off", "leave"].includes(r.assignment?.workType ?? ""));
    return matches && status;
  });
  const weekStart = new Date(`${date}T12:00:00`);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return dayKey(d);
  });
  const weekRows = Array.from(
    new Map(
      week
        .flatMap((day) => officeRows(data, day, organizationId))
        .map((row) => [row.employee.id, row]),
    ).values(),
  ).filter((r) =>
    `${r.employee.name} ${r.employee.code} ${r.organization?.name}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const assignments = new Map(
    data.assignments.map((a) => [a.employeeId + ":" + a.date, a]),
  );
  function edit(employeeId: string, onDate = date) {
    setFormError("");
    const existing = assignments.get(employeeId + ":" + onDate);
    setDraft(
      existing
        ? { ...existing }
        : {
            id: "",
            employeeId,
            date: onDate,
            workType: "work",
            duty: "none",
            baseId: null,
            note: "",
          },
    );
  }
  function moveDay(offset: number) {
    const next = new Date(`${date}T12:00:00`);
    next.setDate(next.getDate() + offset);
    setDate(dayKey(next));
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    const item = {
      ...draft,
      id: draft.id || crypto.randomUUID(),
      note: draft.note.trim(),
    };
    if (
      await save({
        ...data,
        assignments: draft.id
          ? data.assignments.map((a) => (a.id === draft.id ? item : a))
          : [...data.assignments, item],
      })
    ) {
      setDraft(null);
      setFormError("");
    } else
      setFormError("저장하지 못했습니다. 입력값과 저장 위치를 확인하세요.");
  }
  async function closeDraft() {
    if (!draft) return;
    const changed = draft.id
      ? JSON.stringify(draft) !==
        JSON.stringify(data.assignments.find((a) => a.id === draft.id))
      : draft.workType !== "work" ||
        draft.duty !== "none" ||
        draft.baseId !== null ||
        !!draft.note;
    if (
      changed &&
      !(await discardChanges("닫을까요?"))
    )
      return;
    setDraft(null);
  }
  const patch = (value: Partial<Assignment>) =>
    setDraft((current) => (current ? { ...current, ...value } : null));
  return (
    <>
      <div className="office-tabs" role="tablist" aria-label="사무소 관리 메뉴">
        {officeTabs.map(([value, label], index) => (
          <button
            role="tab"
            id={`office-tab-${value}`}
            aria-controls={`office-panel-${value}`}
            tabIndex={tab === value ? 0 : -1}
            aria-selected={tab === value}
            aria-disabled={busy || undefined}
            onKeyDown={(event) => {
              const key = event.key;
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(key))
                return;
              event.preventDefault();
              if (busy) return;
              const nextIndex =
                key === "Home"
                  ? 0
                  : key === "End"
                    ? officeTabs.length - 1
                    : (index +
                        (key === "ArrowRight" ? 1 : -1) +
                        officeTabs.length) %
                      officeTabs.length;
              const next = officeTabs[nextIndex][0];
              setTab(next);
              document.getElementById(`office-tab-${next}`)?.focus();
            }}
            key={value}
            onClick={() => {
              if (!busy) setTab(value);
            }}
            className={tab === value ? "selected" : ""}
          >
            {label}
            {["employees", "organizations", "bases"].includes(value) && (
              <span>
                {data[value as "employees" | "organizations" | "bases"].length}
              </span>
            )}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`office-panel-${tab}`}
        aria-labelledby={`office-tab-${tab}`}
      >
        {["employees", "organizations", "bases"].includes(tab) && (
          <OfficeDirectory
            key={tab}
            kind={tab as "employees" | "organizations" | "bases"}
            data={data}
            save={save}
            busy={busy}
          />
        )}
        {tab === "import" && (
          <OfficeImport data={data} save={save} busy={busy} />
        )}
        {tab === "board" && (
          <>
            {!data.employees.length ? (
              <section className="panel office-start">
                <div className="office-start-icon">
                  <Icon name="people" size={30} />
                </div>
                <h2>사무소 근무현황판을 준비하세요</h2>
                <p>
                  조직과 직원을 등록하면 휴무·연가·당직·숙직·거점근무를 한곳에서
                  확인할 수 있습니다.
                </p>
                <div className="setup-steps">
                  {[
                    ["organizations", "1", "조직 등록", "사무소와 부서 구성"],
                    ["employees", "2", "직원 등록", "직원번호와 소속 연결"],
                    ["bases", "3", "거점 등록", "분소·탐방지원센터"],
                  ].map(([value, num, label, description]) => (
                    <button key={value} onClick={() => setTab(value as Tab)}>
                      <span>{num}</span>
                      <strong>{label}</strong>
                      <small>{description}</small>
                      <Icon name="arrow" size={16} />
                    </button>
                  ))}
                </div>
                <button
                  className="text-button"
                  onClick={() => setTab("import")}
                >
                  기존 명부가 있다면 CSV로 반입
                  <Icon name="arrow" size={15} />
                </button>
              </section>
            ) : (
              <>
                <div className="office-toolbar">
                  <div className="office-date">
                    <button
                      aria-label="근무현황 이전 날짜"
                      onClick={() => moveDay(-1)}
                    >
                      ‹
                    </button>
                    <input
                      aria-label="근무현황 날짜"
                      type="date"
                      required
                      value={date}
                      onChange={(e) => {
                        if (e.target.value) setDate(e.target.value);
                      }}
                    />
                    <button
                      aria-label="근무현황 다음 날짜"
                      onClick={() => moveDay(1)}
                    >
                      ›
                    </button>
                    <button onClick={() => setDate(dayKey())}>오늘</button>
                  </div>
                  <select
                    aria-label="현황판 소속 조직"
                    value={organizationId}
                    onChange={(e) => setOrganizationId(e.target.value)}
                  >
                    <option value="">전체 조직</option>
                    {data.organizations.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                  <input
                    className="office-search"
                    aria-label="직원 현황 검색"
                    placeholder="이름·번호·소속 검색"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <div className="segmented">
                    <button
                      className={view === "day" ? "selected" : ""}
                      aria-pressed={view === "day"}
                      onClick={() => setView("day")}
                    >
                      일별 현황
                    </button>
                    <button
                      className={view === "week" ? "selected" : ""}
                      aria-pressed={view === "week"}
                      onClick={() => {
                        setView("week");
                        setFilter("all");
                      }}
                    >
                      주간 근무표
                    </button>
                  </div>
                </div>
                <div className="office-metrics">
                  {[
                    ["전체 직원", summary.total, "all"],
                    ["근무·출장", summary.working, "working"],
                    ["휴무·연가", summary.off, "off"],
                    ["당직·숙직", summary.duty, "duty"],
                    ["미등록", summary.unregistered, "missing"],
                  ].map(([label, count, key]) => (
                    <button
                      key={label}
                      aria-pressed={view === "day" && filter === key}
                      onClick={() => {
                        setView("day");
                        setFilter(String(key));
                      }}
                      className={
                        key === "missing" && summary.unregistered
                          ? "attention"
                          : ""
                      }
                    >
                      <span>{label}</span>
                      <strong>
                        {count}
                        <small>명</small>
                      </strong>
                    </button>
                  ))}
                </div>
                <section className="panel roster-panel">
                  <h2 className="sr-only">
                    {view === "day"
                      ? `${date} 근무현황`
                      : `${week[0]} ~ ${week[6]} 근무표`}
                  </h2>
                  {view === "week" && (
                    <p className="muted" style={{ margin: "0 0 8px" }}>
                      표를 좌우로 이동해 모든 날짜를 확인하세요. 직원 이름은
                      고정됩니다.
                    </p>
                  )}
                  <div className="table-scroll">
                    {view === "day" ? (
                      <table className="roster-table">
                        <thead>
                          <tr>
                            <th>직원</th>
                            <th>소속</th>
                            <th>근무 구분</th>
                            <th>당직</th>
                            <th>거점·비고</th>
                            <th>
                              <span className="sr-only">등록·수정</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((row) => (
                            <tr key={row.employee.id}>
                              <th scope="row">
                                <strong>{row.employee.name}</strong>
                                <small
                                  title={
                                    row.employee.position || row.employee.code
                                  }
                                >
                                  {row.employee.position || row.employee.code}
                                  {!row.employee.active ? " · 비활성" : ""}
                                </small>
                              </th>
                              <td title={row.organization?.name}>
                                {row.organization?.name}
                              </td>
                              <td>
                                <span
                                  className={`work-status ${row.assignment?.workType ?? "missing"}`}
                                >
                                  {row.assignment
                                    ? workTypes[row.assignment.workType]
                                    : "미등록"}
                                </span>
                              </td>
                              <td>
                                {row.assignment?.duty &&
                                row.assignment.duty !== "none" ? (
                                  <Tag tone="duty">
                                    {dutyTypes[row.assignment.duty]}
                                  </Tag>
                                ) : (
                                  <span className="muted">—</span>
                                )}
                              </td>
                              <td
                                className="roster-note"
                                title={[row.base?.name, row.assignment?.note]
                                  .filter(Boolean)
                                  .join(" · ")}
                              >
                                {row.base && <strong>{row.base.name}</strong>}
                                {row.assignment?.note && (
                                  <span>{row.assignment.note}</span>
                                )}
                                {!row.base && !row.assignment?.note && (
                                  <span className="muted">—</span>
                                )}
                              </td>
                              <td>
                                <button
                                  disabled={busy}
                                  aria-label={`${row.employee.name} 근무 ${row.assignment ? "수정" : "등록"}`}
                                  onClick={() => edit(row.employee.id)}
                                >
                                  {row.assignment ? "수정" : "등록"}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <table className="week-table">
                        <thead>
                          <tr>
                            <th>직원 / 소속</th>
                            {week.map((day) => (
                              <th
                                key={day}
                                className={
                                  day === dayKey() ? "today-column" : ""
                                }
                              >
{formatDate(day, { year: false })}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {weekRows.map((row) => (
                            <tr key={row.employee.id}>
                              <th scope="row">
                                {row.employee.name}
                                <small>{row.organization?.name}</small>
                              </th>
                              {week.map((day) => {
                                const entry = assignments.get(
                                  row.employee.id + ":" + day,
                                );
                                return (
                                  <td
                                    key={day}
                                    className={
                                      day === dayKey() ? "today-column" : ""
                                    }
                                  >
                                    <button
                                      aria-disabled={busy || undefined}
                                      className={`week-cell ${entry?.workType ?? "missing"}`}
                                      onClick={() => {
                                        if (!busy) edit(row.employee.id, day);
                                      }}
                                    >
                                      {/* The visible shift is read first; who/when follow (TASK-PANEL-01 A1). */}
                                      <span>
                                        {entry
                                          ? workTypes[entry.workType]
                                          : "—"}
                                      </span>
                                      {entry?.duty && entry.duty !== "none" && (
                                        <small className="duty-line">
                                          {dutyTypes[entry.duty]}
                                        </small>
                                      )}
                                      {entry?.baseId && (
                                        <small className="base-line">
                                          {
                                            data.bases.find(
                                              (b) => b.id === entry.baseId,
                                            )?.name
                                          }
                                        </small>
                                      )}
                                      <span className="sr-only">
                                        {entry ? "" : " 미등록"} ·{" "}
                                        {row.employee.name}{" "}
                                        {formatDate(day, { year: false })} 근무
                                        편집
                                      </span>
                                    </button>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  {((view === "day" && !filtered.length) ||
                    (view === "week" && !weekRows.length)) && (
                    <Empty>
                      표시할 직원이 없습니다. 검색어와 소속·상태 필터를
                      확인하세요.
                    </Empty>
                  )}
                  <p className="help">
                    미등록은 아직 입력한 근무가 없다는 뜻입니다. 기본 근무와
                    당직은 별도 항목으로 함께 등록합니다. 자동 편성·휴가
                    승인·근태 정산은 제공하지 않습니다.
                  </p>
                </section>
              </>
            )}
          </>
        )}
      </div>
      {draft && (
        <Sheet
          title="근무 등록·수정"
          dirty={
            draft.id
              ? JSON.stringify(draft) !==
                JSON.stringify(data.assignments.find((a) => a.id === draft.id))
              : draft.workType !== "work" ||
                draft.duty !== "none" ||
                draft.baseId !== null ||
                !!draft.note
          }
          busy={busy}
          onClose={() => setDraft(null)}
        >
          <form onSubmit={submit} className="shift-form">
            {formError && (
              <p role="alert" className="error">
                {formError}
              </p>
            )}
            <div className="shift-employee">
              <span className="directory-symbol">
                <Icon name="people" size={24} />
              </span>
              <div>
                <strong>
                  {data.employees.find((e) => e.id === draft.employeeId)?.name}
                </strong>
                <small>
                  {data.employees.find((e) => e.id === draft.employeeId)?.code}{" "}
                  · {draft.date}
                </small>
              </div>
            </div>
            <Field label="기본 근무">
              <select
                autoFocus
                value={draft.workType}
                onChange={(e) =>
                  patch({
                    workType: e.target.value as Assignment["workType"],
                    baseId: null,
                  })
                }
              >
                {Object.entries(workTypes).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="당직 구분">
              <select
                value={draft.duty}
                onChange={(e) =>
                  patch({ duty: e.target.value as Assignment["duty"] })
                }
              >
                {Object.entries(dutyTypes).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            {draft.workType === "base" && (
              <Field label="근무 거점">
                <select
                  required
                  value={draft.baseId ?? ""}
                  onChange={(e) => patch({ baseId: e.target.value || null })}
                >
                  <option value="">거점 선택</option>
                  {data.bases.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ·{" "}
                      {
                        data.organizations.find(
                          (o) => o.id === b.organizationId,
                        )?.name
                      }
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="근무 비고">
              <textarea
                rows={5}
                maxLength={2000}
                value={draft.note}
                onChange={(e) => patch({ note: e.target.value })}
                placeholder="교대 사항, 현장 위치, 참고할 내용"
              />
            </Field>
            <div className="sheet-actions">
              <button className="primary" disabled={busy}>
                근무 저장
              </button>
              <button type="button" disabled={busy} onClick={closeDraft}>
                취소
              </button>
              {draft.id && (
                <button
                  type="button"
                  disabled={busy}
                  className="text-button danger"
                  onClick={async () => {
                    if (
                      (await askConfirm({
                        message: "이 날짜의 근무 기록을 지울까요?",
                        detail: "미등록으로 표시됩니다.",
                        confirmLabel: "지우기",
                        danger: true,
                      })) &&
                      (await save({
                        ...data,
                        assignments: data.assignments.filter(
                          (a) => a.id !== draft.id,
                        ),
                      }))
                    )
                      setDraft(null);
                  }}
                >
                  등록 해제
                </button>
              )}
            </div>
          </form>
        </Sheet>
      )}
    </>
  );
}
