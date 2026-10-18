import { matches, searchText } from "../../shared/search.mjs";
import {
  describeObservations,
  formatCoordinates,
  OBSERVATION_OUTCOMES,
  observationTypes,
  PATROL_KINDS,
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
  formatTime,
  localInput,
  riskNames,
  SectionHead,
  Tag,
} from "../ui";
import { askConfirm } from "../confirm";
/** Title used when the field is left empty, e.g. "단속 3-2구역 14:30" (TASK-PANEL-01 D2). */
function autoTitle(p: Patrol) {
  const at = new Date(p.at);
  const clock = `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
  const zone = p.zone?.trim();
  return `${p.kind ? PATROL_KINDS[p.kind] : "순찰"}${zone ? ` ${zone}구역` : ""} ${clock}`;
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
  // New records start from the most recent patrol's recorder, kind and zone
  // (TASK-PANEL-01 D2): the same person usually patrols the same zone.
  const latest = data.patrols.reduce<Patrol | undefined>(
    (best, p) => (!best || Date.parse(p.at) > Date.parse(best.at) ? p : best),
    undefined,
  );
  const blank = (from: Patrol | undefined = latest, route = ""): Patrol => ({
    id: "",
    title: "",
    at: new Date().toISOString(),
    route,
    observer: from?.observer ?? "",
    ...(from?.kind ? { kind: from.kind } : {}),
    ...(from?.zone ? { zone: from.zone } : {}),
    findings: "",
    action: "",
    risk: "normal",
  });
  const initial = data.patrols.find((p) => p.id === initialId);
  const editor = useEditorDraft(
    initial || blank(),
    !!initial || initialId === "new",
  );
  const { draft, setDraft } = editor;
  const [editorKey, setEditorKey] = useState(0);
  const prefillHint = useId();
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
    if (coordinateError || observationError) return;
    const item: Patrol = {
      ...draft,
      id: draft.id || crypto.randomUUID(),
      title: draft.title.trim() || autoTitle(draft),
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
              onClick={() => resetDraft(blank())}
            >
              순찰 기록 추가
            </button>
          </div>
        </SectionHead>
        <input
          aria-label="순찰 검색"
          placeholder="구간, 기록자, 확인 사항, 좌표 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
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
        {rows.length > 0 && <ListHeader />}
        <div className="row-list" onKeyDown={rowKeys}>
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
                  onClick: () => handover(p),
                },
                { label: "수정", onClick: () => resetDraft(p) },
                { label: "이 기록으로 새 순찰", onClick: () => resetDraft(blank(p, p.route)) },
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
          title={draft.id ? "순찰 기록 수정" : "순찰 기록 등록"}
          busy={busy}
          dirty={editor.dirty}
          onClose={editor.finishEditor}
          error={editor.saveError}
        >
          <form className="editor" onSubmit={submit}>
            <div className="editor-header-actions">
              <button
                className="primary"
                disabled={busy || !!coordinateError || observationError}
              >
                {draft.id ? "변경 저장" : "순찰 저장"}
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
              구간·기록자는 필수입니다. 제목을 비우면 종류·구역·시각으로 자동
              입력됩니다. 저장 후 인수인계로 연결할 수 있습니다.
              {latest && !draft.id && (
                <span id={prefillHint} className="editor-hint">
                  {" "}
                  기록자·순찰 종류·담당구역은 최근 순찰({latest.title})에서
                  가져왔습니다.
                </span>
              )}
            </p>
            <div className="form-row">
              <Field label="순찰 종류">
                <select
                  autoFocus
                  aria-describedby={latest && !draft.id ? prefillHint : undefined}
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
                  aria-describedby={latest && !draft.id ? prefillHint : undefined}
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
                placeholder={autoTitle(draft)}
              />
            </Field>
          </form>
        </EditorDialog>
      )}
    </div>
  );
}
