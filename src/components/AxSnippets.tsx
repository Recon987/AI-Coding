import { useState } from "react";
import { AX_SNIPPET_CATEGORIES, examplesAdded, withExampleSnippets } from "../../shared/ax.mjs";
import { addLabel, editorTitle, SAVE, TARGET } from "../../shared/labels.mjs";
import { matches, searchText } from "../../shared/search.mjs";
import { confirmDelete } from "../confirm";
import type { AxSnippet, AxSnippetCategory, Data, Save } from "../types";
import { Empty, Field, focusFirstInvalid, SectionHead, Tag } from "../ui";
import { EditorDialog, useEditorDraft } from "./EditorDialog";
import { ListHeader, ListRow, rowKeys } from "./ListRow";

// Tags are typed as one comma-separated line and saved as a list.
type Draft = Omit<AxSnippet, "tags"> & { tags: string };
const parseTags = (text: string) => [...new Set(text.split(",").map((t) => t.trim()).filter(Boolean))];
const lineCount = (text: string) => (text ? text.split("\n").length : 0);

/**
 * GIS·AI 스니펫 (module "ax-desk", TASK-AXDESK-02): GEE·Python code, prompts and rule text kept
 * as plain text. Shown with React text only (no HTML) and never run; 복사 uses the clipboard.
 */
export function AxSnippets({
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
  const blank = (): Draft => ({
    id: "",
    title: "",
    category: "gee",
    tags: "",
    snippet: "",
    description: "",
    updatedAt: "",
  });
  const toDraft = (s: AxSnippet): Draft => ({ ...s, tags: s.tags.join(", ") });
  const all = data.axSnippets;
  const initial = all.find((s) => s.id === initialId);
  const editor = useEditorDraft<Draft>(initial ? toDraft(initial) : blank(), !!initial || initialId === "new");
  const { draft, setDraft } = editor;
  const patch = (values: Partial<Draft>) => setDraft((current) => ({ ...current, ...values }));
  const [category, setCategory] = useState<AxSnippetCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [examplesError, setExamplesError] = useState("");

  const count = (c: AxSnippetCategory | "all") => (c === "all" ? all.length : all.filter((s) => s.category === c).length);
  const rows = all
    .filter((s) => (category === "all" || s.category === category) && matches(searchText.axSnippet(s), query))
    .sort((a, b) => Number(!!a.example) - Number(!!b.example) || b.updatedAt.localeCompare(a.updatedAt));

  const tags = parseTags(draft.tags);
  const tagError =
    tags.length > 20
      ? "태그는 20개까지 입력할 수 있습니다."
      : tags.some((t) => t.length > 30)
        ? "태그 하나는 30자 이하로 입력하세요."
        : "";
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (tagError) {
      focusFirstInvalid(e.currentTarget as HTMLFormElement);
      return;
    }
    // An edited example is the user's own snippet from now on.
    const { example: _example, ...rest } = draft;
    const row: AxSnippet = {
      ...rest,
      id: draft.id || crypto.randomUUID(),
      title: draft.title.trim(),
      tags,
      description: draft.description.trim(),
      updatedAt: new Date().toISOString(),
    };
    if (!row.title) return;
    const ok = await save({
      ...data,
      axSnippets: draft.id ? all.map((s) => (s.id === draft.id ? row : s)) : [...all, row],
    });
    if (ok) editor.finishEditor();
    else editor.setSaveError("저장하지 못했습니다. 입력 내용은 유지됩니다. 다시 시도하세요.");
  }
  async function copy(s: AxSnippet) {
    try {
      await navigator.clipboard.writeText(s.snippet);
      setStatus(`'${s.title}' 본문을 복사했습니다(${s.snippet.length.toLocaleString("ko-KR")}자).`);
    } catch {
      setStatus(`'${s.title}' 본문을 복사하지 못했습니다. 행을 펼쳐 본문을 직접 선택해 복사하세요.`);
    }
  }
  async function addExamples() {
    setExamplesError("");
    try {
      if (await save(withExampleSnippets(data))) setStatus("예제 스니펫 3개를 넣었습니다.");
    } catch (error) {
      setExamplesError(error instanceof Error ? error.message : "예제를 넣지 못했습니다.");
    }
  }

  return (
    <div className="workspace-grid">
      <section className="panel records ax-snippets">
        <SectionHead eyebrow="SNIPPETS" title="스니펫 보관함">
          <div className="editor-header-actions">
            <button className="primary" disabled={busy} onClick={() => editor.openEditor(blank())}>
              {addLabel(TARGET.axSnippet)}
            </button>
          </div>
        </SectionHead>
        <div className="segmented ax-zone-filter" role="group" aria-label="분류">
          {(["all", ...Object.keys(AX_SNIPPET_CATEGORIES)] as (AxSnippetCategory | "all")[]).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              className={category === c ? "selected" : ""}
              onClick={() => setCategory(c)}
            >
              {c === "all" ? "전체" : AX_SNIPPET_CATEGORIES[c]} {count(c)}
            </button>
          ))}
        </div>
        <div className="list-tools">
          <input
            aria-label="스니펫 검색"
            placeholder="제목, 태그, 설명, 본문 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <p className="list-count" role="status" aria-atomic="true">
          {status || (query.trim() ? `${rows.length}건 표시` : "")}
        </p>
        {examplesError && (
          <p className="error" role="alert">
            {examplesError}
          </p>
        )}
        {rows.length === 0 && (
          <Empty>
            {all.length ? (
              <>
                조건에 맞는 스니펫이 없습니다.
                <br />
                <button
                  onClick={() => {
                    setCategory("all");
                    setQuery("");
                  }}
                >
                  조건 초기화
                </button>
              </>
            ) : examplesAdded(data) ? (
              "보관한 스니펫이 없습니다. 자주 쓰는 코드나 문구를 등록하세요."
            ) : (
              <>
                보관한 스니펫이 없습니다. 자주 쓰는 코드나 문구를 등록하거나, 예제 3개(Sentinel-2 합성 GEE 코드, 좌표 DD↔DMS 변환,
                보고서 작성 프롬프트)를 넣어 볼 수 있습니다. 예제는 한 번만 넣으며, 지워도 다시 생기지 않습니다.
                <br />
                <button disabled={busy} onClick={addExamples}>
                  예제 3개 넣기
                </button>
              </>
            )}
          </Empty>
        )}
        <div className="row-list" onKeyDown={rowKeys}>
          {rows.length > 0 && <ListHeader whenLabel="수정일" statusLabel="구분" kindLabel="분류" ownerLabel="분량" />}
          {rows.map((s) => (
            <ListRow
              key={s.id}
              busy={busy}
              className="ax-snippet"
              when={s.updatedAt.slice(0, 10)}
              status={s.example ? <Tag>예제</Tag> : null}
              kind={AX_SNIPPET_CATEGORIES[s.category]}
              title={s.title}
              subtitle={s.tags.length ? s.tags.map((t) => `#${t}`).join(" ") : s.description || undefined}
              owner={`${lineCount(s.snippet).toLocaleString("ko-KR")}줄`}
              actions={[
                { label: "복사", primary: true, onClick: () => void copy(s) },
                { label: "수정", onClick: () => editor.openEditor(toDraft(s)) },
                {
                  label: "삭제",
                  tone: "danger" as const,
                  onClick: async () => {
                    if (await confirmDelete(`${s.title} 스니펫`))
                      await save({ ...data, axSnippets: all.filter((x) => x.id !== s.id) });
                  },
                },
              ]}
            >
              {s.description && <p className="record-body">{s.description}</p>}
              {/* Plain React text: no HTML is interpreted and nothing is run. */}
              <pre className="snippet-code" tabIndex={0} aria-label={`${s.title} 본문`}>
                <code>{s.snippet}</code>
              </pre>
            </ListRow>
          ))}
        </div>
        <p className="muted ax-note">스니펫은 글자로만 보관합니다. 이 앱은 코드를 실행하거나 외부로 보내지 않습니다.</p>
      </section>
      {editor.isOpen && (
        <EditorDialog
          title={editorTitle(TARGET.axSnippet, Boolean(draft.id))}
          busy={busy}
          dirty={editor.dirty}
          onClose={editor.finishEditor}
          error={editor.saveError}
          size="md"
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
              제목은 필수입니다. 본문은 글자 그대로 저장되고 복사됩니다(최대 100,000자).
              {draft.example && " 예제를 고쳐 저장하면 예제 표시가 빠지고 내 스니펫이 됩니다."}
            </p>
            <div className="form-row">
              <Field label="제목">
                <input
                  required
                  maxLength={200}
                  autoFocus
                  value={draft.title}
                  onChange={(e) => patch({ title: e.target.value })}
                  placeholder="예: 탐방로 버퍼 분석"
                />
              </Field>
              <Field label="분류">
                <select value={draft.category} onChange={(e) => patch({ category: e.target.value as AxSnippetCategory })}>
                  {Object.entries(AX_SNIPPET_CATEGORIES).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="태그" hint="쉼표로 구분, 20개까지(각 30자 이하). 같은 태그는 한 번만 저장" error={tagError}>
              <input value={draft.tags} onChange={(e) => patch({ tags: e.target.value })} placeholder="예: NDVI, 식생" />
            </Field>
            <Field label="설명">
              <textarea
                rows={2}
                maxLength={2000}
                value={draft.description}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder="언제·어떻게 쓰는지"
              />
            </Field>
            <Field label="본문">
              <textarea
                className="snippet-input"
                rows={12}
                maxLength={100000}
                spellCheck={false}
                value={draft.snippet}
                onChange={(e) => patch({ snippet: e.target.value })}
              />
            </Field>
          </form>
        </EditorDialog>
      )}
    </div>
  );
}
