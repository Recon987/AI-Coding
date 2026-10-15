import { EditorDialog, useEditorDraft } from "./EditorDialog";
import { useState } from "react";
import type { Data, Save, Task } from "../types";
import { Empty, Field, formatTime, localInput, SectionHead, Tag } from "../ui";
type Props = {
  data: Data;
  save: Save;
  busy: boolean;
  kind: Task["kind"];
  initialId?: string;
};
export function Tasks({ data, save, busy, kind, initialId }: Props) {
  const isSubmission = kind === "submission";
  const blank = (): Task => ({
    id: "",
    title: "",
    body: "",
    kind,
    at: new Date().toISOString(),
    assignee: "",
    destination: "",
    priority: "normal",
    remindMinutes: 60,
    patrolId: null,
    done: false,
    completedAt: null,
  });
  const initial = data.tasks.find((t) => t.id === initialId && t.kind === kind);
  const editor = useEditorDraft(
    initial || blank(),
    !!initial || initialId === "new",
  );
  const { draft, setDraft } = editor;
  const [filter, setFilter] = useState(initial?.done ? "done" : "open");
  const [query, setQuery] = useState("");
  const patch = (values: Partial<Task>) => setDraft({ ...draft, ...values });
  const all = data.tasks.filter((t) => t.kind === kind);
  const rows = all
    .filter(
      (t) =>
        (filter === "all" || (filter === "done" ? t.done : !t.done)) &&
        `${t.title} ${t.body} ${t.assignee} ${t.destination}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    )
    .sort(
      (a, b) =>
        Number(a.done) - Number(b.done) || Date.parse(a.at) - Date.parse(b.at),
    );
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const item = {
      ...draft,
      title: draft.title.trim(),
      id: draft.id || crypto.randomUUID(),
    };
    if (!item.title) return;
    const next = draft.id
      ? data.tasks.map((t) => (t.id === draft.id ? item : t))
      : [...data.tasks, item];
    if (await save({ ...data, tasks: next })) editor.finishEditor();
    else
      editor.setSaveError(
        "저장하지 못했습니다. 입력 내용은 유지됩니다. 다시 시도하세요.",
      );
  }
  async function toggle(t: Task) {
    if (
      await save({
        ...data,
        tasks: data.tasks.map((x) =>
          x.id === t.id
            ? {
                ...x,
                done: !x.done,
                completedAt: x.done ? null : new Date().toISOString(),
              }
            : x,
        ),
      })
    ) {
      if (draft.id === t.id) editor.finishEditor();
    }
  }
  return (
    <div className="workspace-grid">
      <section className="panel records">
        <SectionHead
          eyebrow={isSubmission ? "DEADLINES" : "HANDOVER"}
          title={isSubmission ? "제출할 서류" : "이어받을 업무"}
        >
          <div className="editor-header-actions">
            <Tag>{all.filter((t) => !t.done).length}건 남음</Tag>
            <button
              className="primary"
              disabled={busy}
              onClick={() => editor.openEditor(blank())}
            >
              {isSubmission ? "제출 기한 추가" : "인수인계 추가"}
            </button>
          </div>
        </SectionHead>
        <div className="list-tools">
          <div className="segmented">
            {[
              ["open", "진행 중"],
              ["done", "완료"],
              ["all", "전체"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={filter === value ? "selected" : ""}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            aria-label="업무 검색"
            placeholder="제목, 담당자 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {rows.length === 0 && (
          <Empty>
            {query.trim() ? (
              <>
                검색 결과가 없습니다.
                <br />
                <button onClick={() => setQuery("")}>검색 초기화</button>
              </>
            ) : !all.length ? (
              "표시할 업무가 없습니다. 새 업무를 추가하세요."
            ) : filter === "done" ? (
              "완료한 업무가 없습니다."
            ) : (
              "진행 중인 업무가 없습니다."
            )}
          </Empty>
        )}
        {rows.map((t) => (
          <article className={`record ${t.done ? "finished" : ""}`} key={t.id}>
            <details className="record-details">
              <summary>
                <div className="record-top">
                  <Tag tone={t.priority === "high" ? "amber" : ""}>
                    {t.priority === "high"
                      ? "우선 처리"
                      : isSubmission
                        ? "제출 업무"
                        : "인수인계"}
                  </Tag>
                  {!t.done && Date.parse(t.at) < Date.now() && (
                    <Tag tone="red">기한 경과</Tag>
                  )}
                  {t.done && <Tag>완료</Tag>}
                  <span className="muted">
                    {formatTime(t.at)} · {t.assignee || "담당 미지정"}
                  </span>
                </div>
                <h3>{t.title}</h3>
                <p className="record-preview">{t.body || "상세 내용 없음"}</p>
              </summary>
              <div className="record-detail-body">
                <p className="record-body">{t.body || "상세 내용 없음"}</p>
                <div className="metadata">
                  <span>담당 · {t.assignee || "미지정"}</span>
                  <span>마감 · {formatTime(t.at)}</span>
                  {t.destination && <span>제출처 · {t.destination}</span>}
                </div>
                {t.patrolId && (
                  <p className="source">
                    연결된 순찰 ·{" "}
                    {data.patrols.find((p) => p.id === t.patrolId)?.title}
                  </p>
                )}
                {t.done && t.completedAt && (
                  <p className="source">
                    완료 기록 · {formatTime(t.completedAt)}
                  </p>
                )}
              </div>
            </details>
            <div className="record-actions">
              <button
                className="primary small"
                disabled={busy}
                onClick={() => toggle(t)}
              >
                {t.done
                  ? "다시 진행"
                  : isSubmission
                    ? "제출 완료"
                    : "조치 완료"}
              </button>
              <button disabled={busy} onClick={() => editor.openEditor(t)}>
                수정
              </button>
              <button
                className="text-button danger"
                disabled={busy}
                onClick={async () => {
                  if (confirm("이 업무를 삭제할까요?")) {
                    if (
                      await save({
                        ...data,
                        tasks: data.tasks.filter((x) => x.id !== t.id),
                      })
                    ) {
                      if (draft.id === t.id) editor.finishEditor();
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
          title={
            draft.id
              ? "업무 수정"
              : isSubmission
                ? "제출 기한 등록"
                : "인수인계 등록"
          }
          busy={busy}
          dirty={editor.dirty}
          onClose={editor.finishEditor}
          error={editor.saveError}
        >
          <form className="editor" onSubmit={submit}>
            <div className="editor-header-actions">
              <button className="primary" disabled={busy}>
                {draft.id ? "변경 저장" : "업무 등록"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={editor.closeEditor}
              >
                취소
              </button>
            </div>
            <Field label="업무 제목">
              <input
                required
                maxLength={500}
                autoFocus
                value={draft.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder={
                  isSubmission
                    ? "예: 주간 실적 제출"
                    : "예: 탐방로 안내판 후속 점검"
                }
              />
            </Field>
            <div className="form-row">
              <Field label="담당자">
                <input
                  maxLength={100}
                  value={draft.assignee}
                  onChange={(e) => patch({ assignee: e.target.value })}
                  placeholder="이름 또는 담당 업무"
                />
              </Field>
              <Field label="우선순위">
                <select
                  value={draft.priority}
                  onChange={(e) =>
                    patch({ priority: e.target.value as Task["priority"] })
                  }
                >
                  <option value="normal">일반</option>
                  <option value="high">우선 처리</option>
                </select>
              </Field>
            </div>
            <Field label="마감 일시">
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
            {isSubmission && (
              <Field label="제출처">
                <input
                  maxLength={500}
                  value={draft.destination}
                  onChange={(e) => patch({ destination: e.target.value })}
                  placeholder="부서 또는 제출 경로"
                />
              </Field>
            )}
            <Field label="인계·제출 내용">
              <textarea
                rows={5}
                maxLength={20000}
                value={draft.body}
                onChange={(e) => patch({ body: e.target.value })}
                placeholder="진행 상황, 남은 조치, 확인할 사항을 적으세요."
              />
            </Field>
            <Field label="알림 시점">
              <select
                value={draft.remindMinutes}
                onChange={(e) =>
                  patch({ remindMinutes: Number(e.target.value) })
                }
              >
                <option value={0}>마감 시각</option>
                <option value={60}>1시간 전</option>
                <option value={1440}>1일 전</option>
              </select>
            </Field>
            <p className="help">
              앱 실행 중 알림을 표시합니다. 지난 기한은 업무 브리핑에서 확인할
              수 있습니다.
            </p>
          </form>
        </EditorDialog>
      )}
    </div>
  );
}
