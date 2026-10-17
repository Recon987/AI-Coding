import { EditorDialog, useEditorDraft } from "./EditorDialog";
import { useState } from "react";
import type { Data, Save, Call } from "../types";
import { Empty, Field, SectionHead, Tag } from "../ui";
import { confirmDelete } from "../confirm";
import { ListHeader, ListRow, rowKeys } from "./ListRow";
export function Personal({
  data,
  save,
  busy,
  mode,
  initialId,
}: {
  data: Data;
  save: Save;
  busy: boolean;
  mode: "notes" | "calls";
  initialId?: string;
}) {
  const blank = (): Call => ({
    id: "",
    title: "",
    body: "",
    phone: "",
    done: false,
  });
  const initial = data[mode].find((n) => n.id === initialId);
  const editor = useEditorDraft<Call>(
    { ...blank(), ...initial },
    !!initial || initialId === "new",
  );
  const { draft, setDraft } = editor;
  const [query, setQuery] = useState("");
  const rows = data[mode]
    .map((n) => ({ ...blank(), ...n }))
    .filter((n) =>
      `${n.title} ${n.body} ${mode === "calls" ? n.phone : ""}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
    );
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const row = {
      ...draft,
      id: draft.id || crypto.randomUUID(),
      title: draft.title.trim(),
    };
    if (!row.title) return;
    const result =
      mode === "calls"
        ? {
            ...data,
            calls: draft.id
              ? data.calls.map((c) => (c.id === draft.id ? row : c))
              : [row, ...data.calls],
          }
        : {
            ...data,
            notes: draft.id
              ? data.notes.map((n) =>
                  n.id === draft.id
                    ? { id: row.id, title: row.title, body: row.body }
                    : n,
                )
              : [
                  { id: row.id, title: row.title, body: row.body },
                  ...data.notes,
                ],
          };
    if (await save(result)) editor.finishEditor();
    else
      editor.setSaveError(
        "저장하지 못했습니다. 입력 내용은 유지됩니다. 다시 시도하세요.",
      );
  }
  return (
    <div className="workspace-grid">
      <section className="panel records">
        <SectionHead
          eyebrow={mode === "calls" ? "QUICK CALLS" : "WORK NOTES"}
          title={mode === "calls" ? "전화로 받은 업무" : "나의 업무 기록"}
        >
          <div className="editor-header-actions">
            <Tag>{data[mode].length}건</Tag>
            <button
              className="primary"
              disabled={busy}
              onClick={() => editor.openEditor(blank())}
            >
              {mode === "calls" ? "전화메모 추가" : "메모 추가"}
            </button>
          </div>
        </SectionHead>
        <input
          aria-label="기록 검색"
          placeholder={
            mode === "calls" ? "제목·내용·전화번호 검색" : "제목·내용 검색"
          }
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
              "새 기록을 작성하세요."
            )}
          </Empty>
        )}
        {rows.length > 0 && <ListHeader compact ownerLabel={mode === "calls" ? "전화번호" : ""} />}
        <div className="row-list compact" onKeyDown={rowKeys}>
          {rows.map((n) => (
            <ListRow
              key={n.id}
              busy={busy}
              done={mode === "calls" && n.done}
              status={mode === "calls" ? <Tag tone={n.done ? "" : "warning"}>{n.done ? "처리 완료" : "미처리"}</Tag> : <Tag>메모</Tag>}
              title={n.title}
              subtitle={n.body || "내용 없음"}
              owner={mode === "calls" ? n.phone || "번호 없음" : ""}
              actions={[
                ...(mode === "calls"
                  ? [
                      {
                        label: n.done ? "미처리로 변경" : "처리 완료",
                        onClick: async () => {
                          if (
                            (await save({
                              ...data,
                              calls: data.calls.map((c) => (c.id === n.id ? { ...c, done: !c.done } : c)),
                            })) &&
                            draft.id === n.id
                          )
                            editor.finishEditor();
                        },
                      },
                    ]
                  : []),
                { label: "수정", onClick: () => editor.openEditor({ ...blank(), ...n }) },
                {
                  label: "삭제",
                  tone: "danger" as const,
                  onClick: async () => {
                    if (
                      (await confirmDelete("이 기록")) &&
                      (await save({ ...data, [mode]: data[mode].filter((x) => x.id !== n.id) }))
                    ) {
                      if (draft.id === n.id) editor.finishEditor();
                    }
                  },
                },
              ]}
            >
              <p className="record-body">{n.body || "내용 없음"}</p>
              {mode === "calls" && <p className="source">전화번호 · {n.phone || "없음"}</p>}
            </ListRow>
          ))}
        </div>
      </section>
      {editor.isOpen && (
        <EditorDialog
          title={
            draft.id
              ? "기록 수정"
              : mode === "calls"
                ? "전화메모 등록"
                : "메모 작성"
          }
          busy={busy}
          dirty={editor.dirty}
          onClose={editor.finishEditor}
          error={editor.saveError}
        >
          <form className="editor" onSubmit={submit}>
            <div className="editor-header-actions">
              <button className="primary" disabled={busy}>
                저장
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={editor.closeEditor}
              >
                취소
              </button>
            </div>
            <Field label="제목">
              <input
                required
                maxLength={500}
                autoFocus
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </Field>
            {mode === "calls" && (
              <Field label="전화번호">
                <input
                  maxLength={100}
                  value={draft.phone}
                  onChange={(e) =>
                    setDraft({ ...draft, phone: e.target.value })
                  }
                />
              </Field>
            )}
            <Field label={mode === "calls" ? "전달 내용" : "내용"}>
              <textarea
                rows={9}
                maxLength={20000}
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              />
            </Field>
          </form>
        </EditorDialog>
      )}
    </div>
  );
}
