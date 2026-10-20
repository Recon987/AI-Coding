import { ProjectSelect, ReferencePicker } from "./ProjectLinks";
import { unifiedWork } from "../../shared/work.mjs";
import { WorkRow, WorkEditor, parseFollowUp, workDraft } from "./Work";
import { matches, searchText } from "../../shared/search.mjs";
import { EditorDialog, useEditorDraft } from "./EditorDialog";
import { useState } from "react";
import type { Data, Page, Save, Task, SourceRef } from "../types";
import { Empty, Field, formatTime, localInput, SectionHead, Tag } from "../ui";
import { confirmDelete } from "../confirm";
import { ListHeader, ListRow, rowKeys } from "./ListRow";
import { addLabel, editorTitle, SAVE, TARGET } from "../../shared/labels.mjs";
type Props = {
  data: Data;
  save: Save;
  busy: boolean;
  kind: Task["kind"] | "work";
  navigate: (page: Page, id?: string) => void;
  initialId?: string;
};
export function Tasks({ data, save, busy, kind, initialId, navigate }: Props) {
  const isSubmission = kind === "submission";
  const blank = (): Task => ({
    id: "",
    title: "",
    body: "",
    kind: kind === "work" ? "handover" : kind,
    at: new Date().toISOString(),
    assignee: "",
    destination: "",
    priority: "normal",
    remindMinutes: 60,
    patrolId: null,
    done: false,
    completedAt: null,
  });
  const initialSource = parseFollowUp(initialId);
  const initialProject = initialId?.startsWith("project:") ? initialId.slice(8) : null;
  const [source, setSource] = useState<SourceRef | undefined>(initialSource);
  const initialWork = data.workItems.find((w) => w.id === initialId);
  const workEditor = useEditorDraft(initialWork ?? workDraft(data, initialSource, initialProject), !!initialWork || !!initialSource || !!initialProject || (kind === "work" && initialId === "new"));
  const [typeFilter, setTypeFilter] = useState(kind === "work" ? "all" : kind);
  const initial = data.tasks.find((t) => t.id === initialId && t.kind === kind);
  const editor = useEditorDraft(
    initial || blank(),
    !!initial || (kind !== "work" && initialId === "new"),
  );
  const { draft, setDraft } = editor;
  const [filter, setFilter] = useState(initial?.done || initialWork?.status === "done" ? "done" : "open");
  const [query, setQuery] = useState("");
  const patch = (values: Partial<Task>) => setDraft({ ...draft, ...values });
  const [limit, setLimit] = useState(100);
  const taskIndex = new Map(data.tasks.map((t) => [t.id, t]));
  const workIndex = new Map(data.workItems.map((t) => [t.id, t]));
  const all = unifiedWork(data).filter((t) => typeFilter === "all" || (typeFilter === "work" ? t.kind === "general" : t.kind === typeFilter));
  const rows = all.filter((t) =>
    (filter === "all" || (filter === "waiting" ? t.status === "waiting" : filter === "done" ? t.done : !t.done)) &&
    matches(`${t.title} ${t.body} ${t.owner} ${t.kind === "general" ? "작업" : searchText.task(taskIndex.get(t.id)!)}`, query));
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
          title={kind === "work" ? "작업·인수인계·제출" : isSubmission ? "제출할 서류" : "이어받을 업무"}
        >
          <div className="editor-header-actions">
            <Tag>{all.filter((t) => !t.done).length}건 남음</Tag>
            {kind !== "work" && <button disabled={busy} onClick={() => { setSource(undefined); void workEditor.openEditor(workDraft(data)); }}>작업 등록</button>}
            <button
              className="primary"
              disabled={busy}
              onClick={() => { if (kind === "work") { setSource(undefined); void workEditor.openEditor(workDraft(data)); } else void editor.openEditor(blank()); }}
            >
              {kind === "work" ? "작업 등록" : addLabel(isSubmission ? TARGET.submission : TARGET.handover)}
            </button>
          </div>
        </SectionHead>
        <div className="list-tools">
          <select aria-label="업무 유형" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option value="all">전체 유형</option><option value="work">작업</option><option value="handover">인수인계</option><option value="submission">제출</option></select>
          <div className="segmented">
            {[
              ["open", "진행 중"],
              ["done", "완료"],
              ["waiting", "대기"],
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
        <p className="list-count" role="status" aria-atomic="true">
          {query.trim() ? `${rows.length}건 표시` : ""}
        </p>
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
        <div className="row-list" onKeyDown={rowKeys}>
          {rows.length > 0 && <ListHeader />}
          {rows.slice(0, limit).map((row) => {
            if (row.kind === "general") {
              const work = workIndex.get(row.id)!;
              return <WorkRow key={`work:${row.id}`} work={work} data={data} save={save} busy={busy} navigate={navigate} edit={() => { setSource(undefined); void workEditor.openEditor(work); }} />;
            }
            const t = taskIndex.get(row.id)!;
            const isSubmission = t.kind === "submission";
            const overdue = !t.done && Date.parse(t.at) < Date.now();
            return (
              <ListRow
                key={`task:${t.id}`}
                busy={busy}
                done={t.done}
                when={`${formatTime(t.at)} 마감`}
                status={
                  t.done ? (
                    <Tag>완료</Tag>
                  ) : overdue ? (
                    <Tag tone="danger">기한 경과</Tag>
                  ) : t.priority === "high" ? (
                    <Tag tone="warning">우선 처리</Tag>
                  ) : (
                    <Tag>진행 중</Tag>
                  )
                }
                kind={
                  <>
                    {isSubmission ? "제출" : "인수인계"}
                    {t.destination && <small className="zone-label">{t.destination}</small>}
                  </>
                }
                title={t.title}
                subtitle={t.body || "상세 내용 없음"}
                owner={t.assignee || "담당 미지정"}
                actions={[
                  {
                    label: t.done ? "다시 진행" : isSubmission ? "제출 완료" : "조치 완료",
                    primary: true,
                    onClick: () => toggle(t),
                  },
                  { label: "수정", onClick: () => editor.openEditor(t) },
                  {
                    label: "삭제",
                    tone: "danger",
                    onClick: async () => {
                      if (await confirmDelete("이 업무")) {
                        if (await save({ ...data, tasks: data.tasks.filter((x) => x.id !== t.id) })) {
                          if (draft.id === t.id) editor.finishEditor();
                        }
                      }
                    },
                  },
                ]}
              >
                <p className="record-body">{t.body || "상세 내용 없음"}</p>
                <div className="metadata">
                  <span>담당 · {t.assignee || "미지정"}</span>
                  <span>마감 · {formatTime(t.at)}</span>
                  {t.destination && <span>제출처 · {t.destination}</span>}
                </div>
                {t.patrolId && (
                  <p className="source">
                    연결된 순찰 · {data.patrols.find((p) => p.id === t.patrolId)?.title}
                  </p>
                )}
                {t.done && t.completedAt && (
                  <p className="source">완료 기록 · {formatTime(t.completedAt)}</p>
                )}
              </ListRow>
            );
          })}
        </div>
        {rows.length > limit && <button onClick={() => setLimit(limit + 100)}>100건 더 보기 ({limit}/{rows.length})</button>}
      </section>
      <WorkEditor data={data} save={save} busy={busy} editor={workEditor} source={source} navigate={navigate} />
      {editor.isOpen && (
        <EditorDialog
          title={editorTitle((draft.kind === "submission") ? TARGET.submission : TARGET.handover, Boolean(draft.id))}
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
            <Field label="업무 제목">
              <input
                required
                maxLength={500}
                autoFocus
                value={draft.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder={
                  (draft.kind === "submission")
                    ? "예: 주간 실적 제출"
                    : "예: 탐방로 안내판 후속 점검"
                }
              />
            </Field>
            <ProjectSelect data={data} value={draft.projectId ?? null} onChange={(projectId) => patch({ projectId })} busy={busy} />
            <ReferencePicker data={data} value={draft.referenceIds ?? []} onChange={(referenceIds) => patch({ referenceIds })} busy={busy} />
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
            {(draft.kind === "submission") && (
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
