import { formatCoordinates } from "../../shared/model.mjs";
import { EditorDialog, useEditorDraft } from "./EditorDialog";
import { CoordinateInput } from "./CoordinateInput";
import { useState } from "react";
import type { Data, Patrol, Save, Task } from "../types";
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
  const blank = (): Patrol => ({
    id: "",
    title: "",
    at: new Date().toISOString(),
    route: "",
    observer: "",
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
  const [coordinateError, setCoordinateError] = useState("");
  const resetDraft = async (value: Patrol) => {
    if (await editor.openEditor(value)) {
      setCoordinateError("");
      setEditorKey((key) => key + 1);
    }
  };
  const [query, setQuery] = useState("");
  const patch = (values: Partial<Patrol>) =>
    setDraft((current) => ({ ...current, ...values }));
  const rows = [...data.patrols]
    .filter((p) =>
      `${p.title} ${p.route} ${p.observer} ${p.findings} ${p.action} ${p.coordinates ? `${formatCoordinates(p.coordinates)} ${formatCoordinates(p.coordinates, "dms")}` : ""}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
    )
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (coordinateError) return;
    const item = {
      ...draft,
      id: draft.id || crypto.randomUUID(),
      title: draft.title.trim(),
      route: draft.route.trim(),
      observer: draft.observer.trim(),
    };
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
      <section className="panel records">
        <SectionHead eyebrow="FIELD JOURNAL" title="현장에서 남긴 기록">
          <div className="editor-header-actions">
            <Tag>{data.patrols.length}건</Tag>
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
        {rows.map((p) => (
          <article className="record" key={p.id}>
            <details className="record-details">
              <summary>
                <div className="record-top">
                  <Tag
                    tone={
                      p.risk === "urgent"
                        ? "danger"
                        : p.risk === "attention"
                          ? "warning"
                          : ""
                    }
                  >
                    {riskNames[p.risk]}
                  </Tag>
                  <span className="muted">{formatTime(p.at)}</span>
                </div>
                <h3>{p.title}</h3>
                <p className="record-preview">
                  {p.route} · {p.findings || "별도 확인 사항 없음"}
                </p>
              </summary>
              <div className="record-detail-body">
                <p className="route-line">{p.route}</p>
                <p className="record-body">
                  {p.findings || "별도 확인 사항 없음"}
                </p>
                {p.action && (
                  <p className="action-note">
                    <strong>현장 조치</strong> {p.action}
                  </p>
                )}
                {p.coordinates && (
                  <p className="coordinate-summary">
                    {formatCoordinates(p.coordinates)}
                    <br />
                    {formatCoordinates(p.coordinates, "dms")}
                  </p>
                )}
                <p className="source">기록자 · {p.observer}</p>
              </div>
            </details>
            <div className="record-actions">
              <button
                className="primary small"
                disabled={busy}
                onClick={() => handover(p)}
              >
                {data.tasks.some((t) => t.patrolId === p.id && !t.done)
                  ? "후속 조치 보기"
                  : "인수인계로 연결"}
              </button>
              <button disabled={busy} onClick={() => resetDraft(p)}>
                수정
              </button>
              <button
                className="text-button danger"
                disabled={busy}
                onClick={async () => {
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
                }}
              >
                삭제
              </button>
            </div>
          </article>
        ))}
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
              <button className="primary" disabled={busy || !!coordinateError}>
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
              제목·구간·기록자는 필수입니다. 저장 후 인수인계로 연결할 수
              있습니다.
            </p>
            <Field label="기록 제목">
              <input
                required
                maxLength={500}
                autoFocus
                value={draft.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder="예: 오전 탐방로 순찰"
              />
            </Field>
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
          </form>
        </EditorDialog>
      )}
    </div>
  );
}
