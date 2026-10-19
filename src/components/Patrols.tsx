import { matches, searchText } from "../../shared/search.mjs";
import {
  describeObservations,
  formatCoordinates,
  newPatrolDraft,
  OBSERVATION_OUTCOMES,
  observationTypes,
  PATROL_KINDS,
  patrolAutoTitle,
} from "../../shared/model.mjs";
import { ObservationEditor, PatrolSummary } from "./Observations";
import { FormExport } from "./FormExport";
import { ListHeader, ListRow, rowKeys } from "./ListRow";
import { EditorDialog, useEditorDraft } from "./EditorDialog";
import { CoordinateInput } from "./CoordinateInput";
import { useId, useState } from "react";
import type { Data, Patrol, PatrolKind, Save, Task } from "../types";
import {
  Empty,
  Field,
  focusFirstInvalid,
  formatTime,
  localInput,
  riskNames,
  SectionHead,
  Tag,
} from "../ui";
import { askConfirm } from "../confirm";
import { addLabel, editorTitle, SAVE, TARGET } from "../../shared/labels.mjs";
type PrefillField = "observer" | "kind" | "zone" | "route";
/** Fields a new draft took from `from`, as [field, label, value] for the hint. */
function prefillOf(from: Patrol | undefined, value: Patrol) {
  if (!from) return null;
  const fields = (
    [
      ["route", "순찰 구간", value.route],
      ["observer", "기록자", value.observer],
      ["kind", "순찰 종류", value.kind ? PATROL_KINDS[value.kind] : ""],
      ["zone", "담당구역", value.zone ?? ""],
    ] as [PrefillField, string, string][]
  ).filter(([, , v]) => v);
  return fields.length ? { from: from.title, fields } : null;
}

export function Patrols({
  data,
  save,
  busy,
  initialId,
  openTask,
}: {
  data: Data;
  save: Save;
  busy: boolean;
  initialId?: string;
  openTask: (id: string) => void;
}) {
  // New records start from the last patrol added on this PC (recorder, kind, zone;
  // TASK-PANEL-01 D2). Last added, not latest `at`: a late entry of an old patrol or a
  // mistyped future time must not pin the defaults.
  const latest = data.patrols.at(-1);
  const blank = (from: Patrol | undefined = latest, route = ""): Patrol =>
    newPatrolDraft(from, { route });
  const initial = data.patrols.find((p) => p.id === initialId);
  const editor = useEditorDraft(
    initial || blank(),
    !!initial || initialId === "new",
  );
  const { draft, setDraft } = editor;
  const [editorKey, setEditorKey] = useState(0);
  const prefillHint = useId();
  // Which record filled which fields of a new draft; UI state only, never saved.
  const [prefill, setPrefill] = useState(() =>
    initial ? null : prefillOf(latest, blank()),
  );
  const filled = (field: PrefillField) =>
    !draft.id && prefill?.fields.some(([key]) => key === field) ? prefillHint : undefined;
  const startNew = (from = latest, route = "") => {
    const value = blank(from, route);
    setPrefill(prefillOf(from, value));
    return resetDraft(value);
  };
  const [coordinateError, setCoordinateError] = useState("");
  const [observationError, setObservationError] = useState(false);
  const [exporting, setExporting] = useState(false);
  const resetDraft = async (value: Patrol) => {
    if (await editor.openEditor(value)) {
      setCoordinateError("");
      setObservationError(false);
      setEditorKey((key) => key + 1);
    }
  };
  const [query, setQuery] = useState("");
  const patch = (values: Partial<Patrol>) =>
    setDraft((current) => ({ ...current, ...values }));
  const rows = [...data.patrols]
    .filter((p) => matches(searchText.patrol(p), query))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (coordinateError || observationError) {
      // The save button stays usable; it explains and moves to the problem instead.
      editor.setSaveError("좌표 형식이 맞지 않는 칸이 있습니다. 표시된 칸을 고친 뒤 저장하세요.");
      focusFirstInvalid(e.currentTarget as HTMLFormElement);
      return;
    }
    const item: Patrol = {
      ...draft,
      id: draft.id || crypto.randomUUID(),
      title: draft.title.trim() || patrolAutoTitle(draft),
      route: draft.route.trim(),
      observer: draft.observer.trim(),
      zone: draft.zone?.trim(),
      observations: draft.observations?.map((o) => ({ ...o, type: o.type.trim(), note: o.note.trim() })),
    };
    // Optional fields stay absent when unused, so older records keep their shape.
    if (!item.kind) delete item.kind;
    if (!item.zone) delete item.zone;
    if (!item.observations?.length) delete item.observations;
    if (!item.title || !item.route || !item.observer) return;
    if (
      await save({
        ...data,
        patrols: draft.id
          ? data.patrols.map((p) => (p.id === draft.id ? item : p))
          : [...data.patrols, item],
      })
    )
      editor.finishEditor();
    else
      editor.setSaveError(
        "저장하지 못했습니다. 입력 내용은 유지됩니다. 다시 시도하세요.",
      );
  }
  async function handover(p: Patrol) {
    const existing = data.tasks.find((t) => t.patrolId === p.id && !t.done);
    if (existing) {
      openTask(existing.id);
      return;
    }
    const t: Task = {
      id: crypto.randomUUID(),
      title: `${p.title} 후속 조치`,
      body: `구간: ${p.route}\n확인 사항: ${p.findings}\n현장 조치: ${p.action}`,
      kind: "handover",
      at: new Date(Date.now() + 86400000).toISOString(),
      assignee: "",
      destination: "",
      priority: p.risk === "urgent" ? "high" : "normal",
      remindMinutes: 60,
      patrolId: p.id,
      done: false,
      completedAt: null,
    };
    if (await save({ ...data, tasks: [...data.tasks, t] })) openTask(t.id);
  }
  return (
    <div className="workspace-grid">
      {exporting && (
        <FormExport data={data} busy={busy} onClose={() => setExporting(false)} />
      )}
      <PatrolSummary data={data} />
      <section className="panel records">
        <SectionHead eyebrow="FIELD JOURNAL" title="현장에서 남긴 기록">
          <div className="editor-header-actions">
            <Tag>{data.patrols.length}건</Tag>
            <button disabled={busy} onClick={() => setExporting(true)}>
              양식 출력
            </button>
            <button
              className="primary"
              disabled={busy}
              onClick={() => startNew()}
            >
              {addLabel(TARGET.patrol)}
            </button>
          </div>
        </SectionHead>
        <input
          aria-label="순찰 검색"
          placeholder="구간, 기록자, 확인 사항, 좌표 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <p className="list-count" role="status" aria-atomic="true">
          {query.trim() ? `${rows.length}건 표시` : ""}
        </p>
        {!rows.length && (
          <Empty>
            {query.trim() ? (
              <>
                검색 결과가 없습니다.
                <br />
                <button onClick={() => setQuery("")}>검색 초기화</button>
              </>
            ) : (
              "순찰 구간과 확인 사항을 남겨 다음 근무에 연결하세요."
            )}
          </Empty>
        )}
        <div className="row-list" onKeyDown={rowKeys}>
          {rows.length > 0 && <ListHeader />}
          {rows.map((p) => (
            <ListRow
              key={p.id}
              busy={busy}
              when={formatTime(p.at)}
              status={
                <Tag tone={p.risk === "urgent" ? "danger" : p.risk === "attention" ? "warning" : ""}>
                  {riskNames[p.risk]}
                </Tag>
              }
              kind={
                <>
                  {p.kind ? PATROL_KINDS[p.kind] : "순찰"}
                  {p.zone && <small className="zone-label">구역 {p.zone}</small>}
                </>
              }
              title={p.title}
              subtitle={`${p.observations?.length ? `${describeObservations(p.observations)} · ` : ""}${p.route}`}
              owner={p.observer}
              actions={[
                {
                  label: data.tasks.some((t) => t.patrolId === p.id && !t.done)
                    ? "후속 조치 보기"
                    : "인수인계로 연결",
                  primary: true,
                  onClick: () => handover(p),
                },
                { label: "수정", onClick: () => resetDraft(p) },
                // 화면에는 짧게, 화면낭독기에는 전체 이름(TASK-LIST-02).
                { label: "새 순찰", ariaLabel: `이 기록으로 새 순찰 · ${p.title}`, onClick: () => startNew(p, p.route) },
                {
                  label: "삭제",
                  tone: "danger",
                  onClick: async () => {
                    if (
                      await askConfirm({
                        message: "순찰 기록을 삭제할까요?",
                        detail: "연결된 인수인계 내용은 유지하고 연결만 해제합니다.",
                        confirmLabel: "삭제",
                        danger: true,
                      })
                    ) {
                      if (
                        await save({
                          ...data,
                          patrols: data.patrols.filter((x) => x.id !== p.id),
                          tasks: data.tasks.map((t) =>
                            t.patrolId === p.id ? { ...t, patrolId: null } : t,
                          ),
                        })
                      ) {
                        if (draft.id === p.id) editor.finishEditor();
                      }
                    }
                  },
                },
              ]}
            >
              <p className="route-line">{p.route}</p>
              <p className="record-body">{p.findings || "별도 확인 사항 없음"}</p>
              {p.action && (
                <p className="action-note">
                  <strong>현장 조치</strong> {p.action}
                </p>
              )}
              {!!p.observations?.length && (
                <ul className="observation-list">
                  {p.observations.map((o) => (
                    <li key={o.id}>
                      <strong>{o.type}</strong> {o.count}건 · {OBSERVATION_OUTCOMES[o.outcome]}
                      {o.note && ` · ${o.note}`}
                      {o.coordinates && (
                        <span className="coordinate-summary">{formatCoordinates(o.coordinates)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {p.coordinates && (
                <p className="coordinate-summary">
                  {formatCoordinates(p.coordinates)}
                  <br />
                  {formatCoordinates(p.coordinates, "dms")}
                </p>
              )}
            </ListRow>
          ))}
        </div>
      </section>
      {editor.isOpen && (
        <EditorDialog
          title={editorTitle(TARGET.patrol, Boolean(draft.id))}
          busy={busy}
          dirty={editor.dirty}
          onClose={editor.finishEditor}
          error={editor.saveError}
        >
          <form className="editor" onSubmit={submit}>
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
            </div>
            <p className="editor-intro">
              저장 후 인수인계로 연결할 수 있습니다.
            </p>
            {!draft.id && prefill && (
              <p id={prefillHint} className="editor-hint">
                ‘{prefill.from}’에서 가져옴:{" "}
                {prefill.fields.map(([, label, value]) => `${label} ${value}`).join(" · ")}. 다른
                사람·구역이면 바꾸세요.
              </p>
            )}
            <div className="form-row">
              <Field label="순찰 종류">
                <select
                  autoFocus
                  aria-describedby={filled("kind")}
                  value={draft.kind ?? ""}
                  onChange={(e) =>
                    patch({ kind: (e.target.value || null) as PatrolKind | null })
                  }
                >
                  <option value="">선택 안 함</option>
                  {Object.entries(PATROL_KINDS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="담당구역 번호">
                <input
                  maxLength={50}
                  aria-describedby={filled("zone")}
                  value={draft.zone ?? ""}
                  onChange={(e) => patch({ zone: e.target.value })}
                  placeholder="선택 · 예: 3-2"
                />
              </Field>
            </div>
            <Field label="순찰 구간">
              <input
                required
                maxLength={500}
                aria-describedby={filled("route")}
                value={draft.route}
                onChange={(e) => patch({ route: e.target.value })}
                placeholder="출발 거점 → 점검 구간 → 도착 거점"
              />
            </Field>
            <div className="form-row">
              <Field label="기록자">
                <input
                  required
                  maxLength={100}
                  aria-describedby={filled("observer")}
                  value={draft.observer}
                  onChange={(e) => patch({ observer: e.target.value })}
                />
              </Field>
              <Field label="확인 등급">
                <select
                  value={draft.risk}
                  onChange={(e) =>
                    patch({ risk: e.target.value as Patrol["risk"] })
                  }
                >
                  {Object.entries(riskNames).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="순찰 일시">
              <input
                type="datetime-local"
                required
                value={localInput(draft.at)}
                onChange={(e) => {
                  if (e.target.value)
                    patch({ at: new Date(e.target.value).toISOString() });
                }}
              />
            </Field>
            <details
              className="coordinate-details"
              key={`details-${editorKey}`}
              open={draft.coordinates ? true : undefined}
            >
              <summary>
                현장 좌표 <span>선택 · DD / DMS</span>
              </summary>
              <CoordinateInput
                key={editorKey}
                initial={draft.coordinates}
                busy={busy}
                onChange={(coordinates, error) => {
                  setCoordinateError(error);
                  editor.setExtraDirty(!!error);
                  if (!error) patch({ coordinates });
                }}
              />
            </details>
            <Field label="확인 사항">
              <textarea
                rows={4}
                maxLength={20000}
                value={draft.findings}
                onChange={(e) => patch({ findings: e.target.value })}
                placeholder="탐방로, 시설, 탐방객 안내, 자원 보호 등"
              />
            </Field>
            <Field label="현장 조치">
              <textarea
                rows={3}
                maxLength={20000}
                value={draft.action}
                onChange={(e) => patch({ action: e.target.value })}
              />
            </Field>
            <ObservationEditor
              key={`observations-${editorKey}`}
              value={draft.observations ?? []}
              suggestions={observationTypes(data)}
              busy={busy}
              onChange={(observations) => patch({ observations })}
              onErrorChange={(hasError) => {
                setObservationError(hasError);
                editor.setExtraDirty(hasError);
              }}
            />
            <Field label="기록 제목 (선택, 비우면 자동)">
              <input
                maxLength={500}
                value={draft.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder={patrolAutoTitle(draft)}
              />
            </Field>
          </form>
        </EditorDialog>
      )}
    </div>
  );
}
