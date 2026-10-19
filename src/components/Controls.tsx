import { useState } from "react";
import { CONTROL_REASONS, dayKey } from "../../shared/model.mjs";
import { askConfirm, confirmDelete } from "../confirm";
import type { Control, Data, Save } from "../types";
import { Empty, Field, focusFirstInvalid, SectionHead, Tag } from "../ui";
import { EditorDialog, useEditorDraft } from "./EditorDialog";
import { ListHeader, ListRow, rowKeys } from "./ListRow";
import { addLabel, editorTitle, SAVE, TARGET } from "../../shared/labels.mjs";

type Filter = "active" | "upcoming" | "ended";
const state = (c: Control, today: string): Filter =>
  c.start > today ? "upcoming" : c.end !== null && c.end < today ? "ended" : "active";
const period = (c: Control) => `${c.start} ~ ${c.end ?? "해제 시까지"}`;

/** 탐방로 통제: closures are recorded once and derived into the briefing and calendar. */
export function Controls({
  data,
  save,
  busy,
  initialId,
}: {
  data: Data;
  save: Save;
  busy: boolean;
  initialId?: string;
}) {
  const today = dayKey();
  const blank = (): Control => ({
    id: "",
    title: "",
    zone: null,
    reason: "fire",
    start: today,
    end: null,
    note: "",
  });
  const initial = data.controls.find((c) => c.id === initialId);
  const editor = useEditorDraft<Control>(initial ?? blank(), !!initial || initialId === "new");
  const { draft, setDraft } = editor;
  const [filter, setFilter] = useState<Filter>(initial ? state(initial, today) : "active");
  const patch = (values: Partial<Control>) => setDraft((current) => ({ ...current, ...values }));
  const counts = { active: 0, upcoming: 0, ended: 0 };
  for (const c of data.controls) counts[state(c, today)]++;
  const rows = data.controls
    .filter((c) => state(c, today) === filter)
    .sort((a, b) => (filter === "ended" ? b.start.localeCompare(a.start) : a.start.localeCompare(b.start)));

  const endError =
    draft.end && draft.end < draft.start ? "종료일은 시작일과 같거나 이후여야 합니다." : "";
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const row: Control = {
      ...draft,
      id: draft.id || crypto.randomUUID(),
      title: draft.title.trim(),
      zone: draft.zone?.trim() || null,
      note: draft.note.trim(),
      end: draft.end || null,
    };
    if (!row.title) return;
    if (endError) {
      focusFirstInvalid(e.currentTarget as HTMLFormElement);
      return;
    }
    const ok = await save({
      ...data,
      controls: draft.id
        ? data.controls.map((c) => (c.id === draft.id ? row : c))
        : [...data.controls, row],
    });
    if (ok) {
      editor.finishEditor();
      setFilter(state(row, today));
    } else editor.setSaveError("저장하지 못했습니다. 입력 내용은 유지됩니다. 다시 시도하세요.");
  }
  async function lift(c: Control) {
    if (state(c, today) !== "active") return;
    const ok = await askConfirm({
      message: `${c.title} 통제를 오늘(${today})로 해제할까요?`,
      detail: "종료일이 오늘로 바뀌고 내일부터 브리핑에 나타나지 않습니다.",
      confirmLabel: "오늘 해제",
    });
    if (ok)
      await save({
        ...data,
        controls: data.controls.map((x) => (x.id === c.id ? { ...x, end: today } : x)),
      });
  }

  return (
    <div className="workspace-grid">
      <section className="panel records">
        <SectionHead title="탐방로 통제">
          <div className="editor-header-actions">
            <button className="primary" disabled={busy} onClick={() => editor.openEditor(blank())}>
              {addLabel(TARGET.control)}
            </button>
          </div>
        </SectionHead>
        <div className="segmented" role="tablist" aria-label="통제 상태">
          {(
            [
              ["active", "진행 중"],
              ["upcoming", "예정"],
              ["ended", "종료"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={filter === key}
              className={filter === key ? "selected" : ""}
              onClick={() => setFilter(key)}
            >
              {label} {counts[key]}
            </button>
          ))}
        </div>
        {!rows.length && (
          <Empty>
            {filter === "active"
              ? "오늘 진행 중인 통제가 없습니다. 산불조심기간·기상특보 통제를 등록하면 브리핑과 달력에 표시됩니다."
              : filter === "upcoming"
                ? "예정된 통제가 없습니다."
                : "종료된 통제가 없습니다."}
          </Empty>
        )}
        <div className="row-list" onKeyDown={rowKeys}>
          {rows.length > 0 && <ListHeader ownerLabel="담당구역" />}
          {rows.map((c) => (
            <ListRow
              key={c.id}
              busy={busy}
              className="control-record"
              done={state(c, today) === "ended"}
              when={period(c)}
              status={
                <Tag tone={state(c, today) === "active" ? "control" : ""}>
                  {{ active: "진행 중", upcoming: "예정", ended: "종료" }[state(c, today)]}
                </Tag>
              }
              kind={CONTROL_REASONS[c.reason]}
              title={c.title}
              subtitle={c.note || undefined}
              owner={c.zone ?? "—"}
              actions={[
                // 상태 변경 동작을 맨 앞에 두어 다른 목록과 순서를 맞춘다(TASK-LIST-02).
                ...(state(c, today) === "active" ? [{ label: "오늘 해제", primary: true, onClick: () => lift(c) }] : []),
                { label: "수정", onClick: () => editor.openEditor(c) },
                {
                  label: "삭제",
                  tone: "danger" as const,
                  onClick: async () => {
                    if (await confirmDelete(`${c.title} 통제 기록`))
                      await save({ ...data, controls: data.controls.filter((x) => x.id !== c.id) });
                  },
                },
              ]}
            >
              {c.note && <p className="record-body">{c.note}</p>}
              <p className="source">
                {CONTROL_REASONS[c.reason]} · {period(c)}
                {c.zone && ` · 담당구역 ${c.zone}`}
              </p>
            </ListRow>
          ))}
        </div>
      </section>
      {editor.isOpen && (
        <EditorDialog
          title={editorTitle(TARGET.control, Boolean(draft.id))}
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
              <button type="button" disabled={busy} onClick={editor.closeEditor}>
                취소
              </button>
            </div>
            <p className="editor-intro">
              통제 구간과 시작일은 필수입니다. 종료일을 비우면 해제할 때까지 진행 중으로 표시됩니다.
            </p>
            <Field label="통제 구간·대상">
              <input
                required
                maxLength={500}
                autoFocus
                value={draft.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder="예: 백담사~대청봉 탐방로"
              />
            </Field>
            <div className="form-row">
              <Field label="통제 사유">
                <select value={draft.reason} onChange={(e) => patch({ reason: e.target.value as Control["reason"] })}>
                  {Object.entries(CONTROL_REASONS).map(([value, label]) => (
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
                  placeholder="선택"
                />
              </Field>
            </div>
            <div className="form-row">
              <Field label="시작일">
                <input type="date" required value={draft.start} onChange={(e) => e.target.value && patch({ start: e.target.value })} />
              </Field>
              <Field label="종료일" hint="비우면 해제할 때까지" error={endError}>
                <input
                  type="date"
                  min={draft.start}
                  value={draft.end ?? ""}
                  onChange={(e) => patch({ end: e.target.value || null })}
                />
              </Field>
            </div>
            <Field label="메모">
              <textarea
                rows={3}
                maxLength={2000}
                value={draft.note}
                onChange={(e) => patch({ note: e.target.value })}
                placeholder="근거(공문·특보), 우회 안내 등"
              />
            </Field>
          </form>
        </EditorDialog>
      )}
    </div>
  );
}
