import { useId, useMemo, useState } from "react";
import {
  dayKey,
  OBSERVATION_OUTCOMES,
  patrolSummary,
} from "../../shared/model.mjs";
import { periodRange } from "../../shared/dates.mjs";
import type { Data, Observation } from "../types";
import { CoordinateInput } from "./CoordinateInput";

const blankObservation = (): Observation => ({
  id: crypto.randomUUID(),
  type: "",
  count: 1,
  outcome: "guidance",
  note: "",
});

/** Counted findings for one patrol (e.g. 흡연 2건 계도). Location is optional lat/long. */
export function ObservationEditor({
  value,
  suggestions,
  busy,
  onChange,
  onErrorChange,
}: {
  value: Observation[];
  suggestions: string[];
  busy: boolean;
  onChange: (next: Observation[]) => void;
  onErrorChange: (hasError: boolean) => void;
}) {
  const listId = useId();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const setError = (id: string, message: string) => {
    const next = { ...errors };
    if (message) next[id] = message;
    else delete next[id];
    setErrors(next);
    onErrorChange(Object.keys(next).length > 0);
  };
  const update = (id: string, fields: Partial<Observation>) =>
    onChange(value.map((o) => (o.id === id ? { ...o, ...fields } : o)));
  const remove = (id: string) => {
    setError(id, "");
    onChange(value.filter((o) => o.id !== id));
  };
  return (
    <fieldset className="observations">
      <legend>
        단속·확인 건 <span>선택 · 유형별 건수</span>
      </legend>
      <datalist id={listId}>
        {suggestions.map((type) => (
          <option key={type} value={type} />
        ))}
      </datalist>
      {value.map((o, index) => (
        <div className="observation-row" key={o.id} role="group" aria-label={`단속·확인 ${index + 1}`}>
          <label className="observation-type">
            <span>유형</span>
            <input
              required
              maxLength={50}
              list={listId}
              value={o.type}
              disabled={busy}
              placeholder="예: 샛길·출입금지구역 출입"
              onChange={(e) => update(o.id, { type: e.target.value })}
            />
          </label>
          <label className="observation-count">
            <span>건수</span>
            <input
              type="number"
              min={1}
              max={9999}
              step={1}
              required
              value={o.count}
              disabled={busy}
              onChange={(e) => {
                const n = Number.parseInt(e.target.value, 10);
                update(o.id, { count: Number.isFinite(n) ? Math.min(9999, Math.max(1, n)) : 1 });
              }}
            />
          </label>
          <label className="observation-outcome">
            <span>조치</span>
            <select
              value={o.outcome}
              disabled={busy}
              onChange={(e) => update(o.id, { outcome: e.target.value as Observation["outcome"] })}
            >
              {Object.entries(OBSERVATION_OUTCOMES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="text-button danger"
            disabled={busy}
            aria-label={`단속·확인 ${index + 1} 빼기`}
            onClick={() => remove(o.id)}
          >
            빼기
          </button>
          <label className="observation-note">
            <span>메모</span>
            <input
              maxLength={500}
              value={o.note}
              disabled={busy}
              placeholder="인적사항은 적지 마세요"
              onChange={(e) => update(o.id, { note: e.target.value })}
            />
          </label>
          <details className="observation-location" open={o.coordinates ? true : undefined}>
            <summary>위치 (위도·경도)</summary>
            <CoordinateInput
              initial={o.coordinates ?? null}
              busy={busy}
              onChange={(coordinates, error) => {
                setError(o.id, error);
                if (!error) update(o.id, { coordinates });
              }}
            />
          </details>
        </div>
      ))}
      <button
        type="button"
        disabled={busy || value.length >= 50}
        onClick={() => onChange([...value, blankObservation()])}
      >
        + 단속·확인 건 추가
      </button>
    </fieldset>
  );
}

type Period = "week" | "month" | "30days";

export function PatrolSummary({ data }: { data: Data }) {
  const [period, setPeriod] = useState<Period>("week");
  const range = periodRange(period, dayKey());
  const summary = useMemo(() => patrolSummary(data, range), [data, range.startDate, range.endDate]);
  return (
    <section className="panel patrol-summary" aria-labelledby="patrol-summary-title">
      <div className="summary-head">
        <h2 id="patrol-summary-title">단속·확인 집계</h2>
        <select aria-label="집계 기간" value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
          <option value="week">이번 주</option>
          <option value="month">이번 달</option>
          <option value="30days">최근 30일</option>
        </select>
        <span className="muted">
          {range.startDate} ~ {range.endDate} · 순찰 {summary.patrols}건
          {summary.byKind.length > 0 && ` (${summary.byKind.map((k) => `${k.label} ${k.count}`).join(", ")})`}
        </span>
      </div>
      {summary.observations.length ? (
        <table className="summary-table">
          <thead>
            <tr>
              <th scope="col">유형</th>
              <th scope="col">건수</th>
              {Object.values(OBSERVATION_OUTCOMES).map((label) => (
                <th scope="col" key={label}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.observations.map((row) => (
              <tr key={row.type}>
                <th scope="row">{row.type}</th>
                <td>{row.count}</td>
                <td>{row.guidance}</td>
                <td>{row.fine}</td>
                <td>{row.other}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">합계</th>
              <td>{summary.totalCount}</td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      ) : (
        <p className="compact-empty">이 기간에 기록한 단속·확인 건이 없습니다. 순찰 기록에서 유형별 건수를 남기면 여기에 합산됩니다.</p>
      )}
    </section>
  );
}
