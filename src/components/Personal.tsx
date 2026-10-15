import { useState } from "react";
import type { Data, Save, Call } from "../types";
import { Empty, Field, SectionHead, Tag } from "../ui";
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
  const [draft, setDraft] = useState<Call>(() => ({
    ...blank(),
    ...data[mode].find((n) => n.id === initialId),
  }));
  const [query, setQuery] = useState("");
  const rows = data[mode]
    .map((n) => ({ ...blank(), ...n }))
    .filter((n) =>
      `${n.title} ${n.body} ${mode === "calls" ? n.phone : ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
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
    if (await save(result)) setDraft(blank());
  }
  return (
    <div className="workspace-grid">
      <section className="panel records">
        <SectionHead
          eyebrow={mode === "calls" ? "QUICK CALLS" : "WORK NOTES"}
          title={mode === "calls" ? "전화로 받은 업무" : "나의 업무 기록"}
        >
          <Tag>{data[mode].length}건</Tag>
        </SectionHead>
        <input
          aria-label="기록 검색"
          placeholder="제목·내용·전화번호 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {!rows.length && <Empty>새 기록을 작성하세요.</Empty>}
        {rows.map((n) => (
          <article className="record" key={n.id}>
            <h3 className={mode === "calls" && n.done ? "done" : ""}>
              {n.title}
            </h3>
            {mode === "calls" && <p className="source">{n.phone}</p>}
            <p className="record-body">{n.body}</p>
            <div className="record-actions">
              {mode === "calls" && (
                <button
                  className="primary small"
                  disabled={busy}
                  onClick={async () => {
                    if (
                      (await save({
                        ...data,
                        calls: data.calls.map((c) =>
                          c.id === n.id ? { ...c, done: !c.done } : c,
                        ),
                      })) &&
                      draft.id === n.id
                    )
                      setDraft(blank());
                  }}
                >
                  {n.done ? "미처리로 변경" : "처리 완료"}
                </button>
              )}
              <button
                disabled={busy}
                onClick={() => setDraft({ ...blank(), ...n })}
              >
                수정
              </button>
              <button
                className="text-button danger"
                disabled={busy}
                onClick={async () => {
                  if (
                    confirm("기록을 삭제할까요?") &&
                    (await save({
                      ...data,
                      [mode]: data[mode].filter((x) => x.id !== n.id),
                    }))
                  ) {
                    if (draft.id === n.id) setDraft(blank());
                  }
                }}
              >
                삭제
              </button>
            </div>
          </article>
        ))}
      </section>
      <form className="panel editor" onSubmit={submit}>
        <SectionHead
          title={
            draft.id
              ? "기록 수정"
              : mode === "calls"
                ? "전화메모 등록"
                : "메모 작성"
          }
        />
        <Field label="제목">
          <input
            required
            maxLength={500}
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </Field>
        {mode === "calls" && (
          <Field label="전화번호">
            <input
              maxLength={100}
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
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
        <div className="form-actions">
          <button className="primary" disabled={busy}>
            저장
          </button>
          {draft.id && (
            <button type="button" onClick={() => setDraft(blank())}>
              취소
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
