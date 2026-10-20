import { useEffect, useId, useState } from "react";
import type { Data, Page, Save, SourceRef, WorkItem } from "../types";
import { WORK_STATUS, dueState, dueText, followUps, newWork, setWorkStatus, sourceInfo, workSources } from "../../shared/work.mjs";
import { Empty, Field, localInput, Tag } from "../ui";
import { setDraftDirty } from "../drafts";
import { confirmDelete } from "../confirm";
import { EditorDialog, useEditorDraft } from "./EditorDialog";
import { ListRow } from "./ListRow";

export const followUpId = (ref: SourceRef) => `followup:${ref.type}:${ref.id}`;
export function parseFollowUp(id?: string): SourceRef | undefined {
  const match = /^followup:(note|call|meeting):(.+)$/.exec(id ?? "");
  return match ? { type: match[1] as SourceRef["type"], id: match[2] } : undefined;
}
export function workDraft(data: Data, source?: SourceRef) {
  const original = source && sourceInfo(data, source).row;
  return newWork({ id: "", title: original ? `후속: ${original.title}`.slice(0, 500) : "", body: original?.body ?? "" });
}

export function QuickWork({ data, save, busy }: { data: Data; save: Save; busy: boolean }) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const draftId = useId();
  useEffect(() => { setDraftDirty(draftId, !!title); return () => setDraftDirty(draftId, false); }, [draftId, title]);
  return <form className="quick-work" aria-label="작업 빠른 등록" onSubmit={async (e) => {
    e.preventDefault();
    if (busy || !title.trim()) return;
    if (await save({ ...data, workItems: [...data.workItems, newWork({ id: crypto.randomUUID(), title: title.trim() })] })) { setTitle(""); setError(""); }
    else setError("저장하지 못했습니다. 입력 내용은 유지됩니다.");
  }}>
    <label className="sr-only" htmlFor="quick-work-title">새 작업 제목</label>
    <input id="quick-work-title" maxLength={500} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="지금 할 일 한 줄 · 기한 없이 등록" disabled={busy} />
    <button className="primary" disabled={busy || !title.trim()}>작업 등록</button>
    {error && <p className="notice error" role="alert">{error}</p>}
  </form>;
}

export function FollowUpSummary({ data, source }: { data: Data; source: SourceRef }) {
  const rows = followUps(data, source);
  return rows.length ? <span className="source">후속 작업 완료 {rows.filter((w) => w.status === "done").length} / 전체 {rows.length}</span> : null;
}
export function FollowUpPanel({ data, source, navigate, busy }: { data: Data; source: SourceRef; navigate: (page: Page, id?: string) => void; busy: boolean }) {
  const rows = followUps(data, source);
  return <div className="follow-up-panel" aria-label="연결된 후속 작업">
    <FollowUpSummary data={data} source={source} />
    {rows.map((w) => <button key={w.id} className="text-button" disabled={busy} onClick={() => navigate("work", w.id)}>{w.title} · {WORK_STATUS[w.status]} · {dueText(w)}</button>)}
    <button disabled={busy} onClick={() => navigate("work", followUpId(source))}>+ 후속 작업</button>
  </div>;
}

export function WorkRow({ work, data, save, busy, edit, navigate }: { work: WorkItem; data: Data; save: Save; busy: boolean; edit: () => void; navigate: (page: Page, id?: string) => void }) {
  const state = dueState(work);
  const sources = workSources(data, work.id);
  const stateLabel = state === "overdue" ? "기한 경과" : state === "today" ? "오늘 마감" : state === "upcoming" ? "예정" : WORK_STATUS[work.status];
  return <ListRow title={work.title} subtitle={<>{work.body || "상세 내용 없음"}{sources.length > 0 && <span className="source">{sources.map((s) => s.label).join(" · ")}</span>}</>} kind="작업" owner={work.owner || "담당 미지정"} when={dueText(work)} done={work.status === "done"} busy={busy}
    status={<Tag tone={state === "overdue" ? "danger" : state === "today" ? "warning" : ""}>{stateLabel}{["waiting", "doing"].includes(work.status) && stateLabel !== WORK_STATUS[work.status] ? ` · ${WORK_STATUS[work.status]}` : ""}</Tag>}
    actions={[
      { label: work.status === "done" ? "다시 진행" : "완료", primary: true, onClick: () => { void save({ ...data, workItems: data.workItems.map((w) => w.id === work.id ? setWorkStatus(w, w.status === "done" ? "doing" : "done") : w) }); } },
      { label: "수정", onClick: edit },
      { label: "삭제", tone: "danger", onClick: async () => { if (await confirmDelete("이 작업")) await save({ ...data, workItems: data.workItems.filter((w) => w.id !== work.id) }); } },
    ]}>
    <p className="record-body">{work.body || "상세 내용 없음"}</p>
    <div className="metadata"><span>상태 · {WORK_STATUS[work.status]}</span><span>{dueText(work)}</span><span>{work.priority === "high" ? "우선 처리" : "일반"}</span></div>
    {sources.map((s) => s.row ? <button key={`${s.ref.type}:${s.ref.id}`} className="text-button" disabled={busy} onClick={() => navigate(s.page, s.ref.id)}>{s.label}</button> : <p className="source" key={`${s.ref.type}:${s.ref.id}`}>{s.label}</p>)}
    {work.completedAt && <p className="source">완료 기록 · {new Date(work.completedAt).toLocaleString("ko-KR")}</p>}
  </ListRow>;
}

export function WorkEditor({ data, save, busy, editor, source, navigate }: { data: Data; save: Save; busy: boolean; editor: ReturnType<typeof useEditorDraft<WorkItem>>; source?: SourceRef; navigate: (page: Page, id?: string) => void }) {
  const { draft, setDraft } = editor;
  const patch = (value: Partial<WorkItem>) => setDraft({ ...draft, ...value });
  if (!editor.isOpen) return null;
  return <EditorDialog title={draft.id ? "작업 수정" : "작업 등록"} busy={busy} dirty={editor.dirty} onClose={editor.finishEditor} error={editor.saveError}>
    <form className="editor" onSubmit={async (e) => {
      e.preventDefault();
      if (busy || !draft.title.trim()) return;
      const now = new Date().toISOString();
      const item = { ...draft, id: draft.id || crypto.randomUUID(), title: draft.title.trim(), updatedAt: now, completedAt: draft.status === "done" ? draft.completedAt ?? now : null };
      const sourceTitle = source ? sourceInfo(data, source).row?.title : undefined;
      const link = !draft.id && source ? { id: crypto.randomUUID(), from: source, to: { type: "workItem" as const, id: item.id }, role: "followUp" as const, createdAt: now, ...(sourceTitle ? { sourceTitle: sourceTitle.slice(0, 500) } : {}) } : undefined;
      const next = { ...data, workItems: draft.id ? data.workItems.map((w) => w.id === draft.id ? item : w) : [...data.workItems, item], links: link ? [...data.links, link] : data.links };
      if (await save(next)) editor.finishEditor();
      else editor.setSaveError("저장하지 못했습니다. 입력 내용은 유지됩니다. 다시 시도하세요.");
    }}>
      <div className="editor-header-actions"><button className="primary" disabled={busy}>저장</button><button type="button" disabled={busy} onClick={editor.closeEditor}>취소</button></div>
      <Field label="작업 제목"><input required autoFocus maxLength={500} value={draft.title} onChange={(e) => patch({ title: e.target.value })} /></Field>
      {source && <p className="source">{sourceInfo(data, source).label}</p>}
      {draft.id && workSources(data, draft.id).map((s) => s.row ? <button type="button" key={`${s.ref.type}:${s.ref.id}`} disabled={busy} onClick={() => navigate(s.page, s.ref.id)}>{s.label}</button> : <p className="source" key={`${s.ref.type}:${s.ref.id}`}>{s.label}</p>)}
      <div className="form-row">
        <Field label="상태"><select value={draft.status} onChange={(e) => patch({ status: e.target.value as WorkItem["status"] })}>{Object.entries(WORK_STATUS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></Field>
        <Field label="우선순위"><select value={draft.priority} onChange={(e) => patch({ priority: e.target.value as WorkItem["priority"] })}><option value="normal">일반</option><option value="high">우선 처리</option></select></Field>
      </div>
      <Field label="담당자"><input maxLength={100} value={draft.owner} onChange={(e) => patch({ owner: e.target.value })} /></Field>
      <Field label="기한 방식"><select value={draft.due?.kind ?? "none"} onChange={(e) => {
        // 방식 선택 때만 사용자가 입력할 빈 칸을 만든다. 새 기록 기본값은 기한 없음.
        patch({ due: e.target.value === "none" ? null : e.target.value === "date" ? { kind: "date", date: "" } : { kind: "datetime", at: "" }, remindMinutes: null });
      }}><option value="none">기한 없음</option><option value="date">날짜만</option><option value="datetime">일시</option></select></Field>
      {draft.due?.kind === "date" && <Field label="마감 날짜"><input required type="date" min="0001-01-01" max="9999-12-31" value={draft.due.date} onChange={(e) => patch({ due: { kind: "date", date: e.target.value } })} /></Field>}
      {draft.due?.kind === "datetime" && <>
        <Field label="마감 일시"><input required type="datetime-local" min="0001-01-01T00:00" max="9999-12-31T23:59" value={draft.due.at ? localInput(draft.due.at) : ""} onChange={(e) => patch({ due: { kind: "datetime", at: e.target.value ? new Date(e.target.value).toISOString() : "" } })} /></Field>
        <Field label="알림 시점"><select value={draft.remindMinutes ?? "off"} onChange={(e) => patch({ remindMinutes: e.target.value === "off" ? null : Number(e.target.value) })}><option value="off">알림 없음</option><option value="0">마감 시각</option><option value="60">1시간 전</option><option value="1440">1일 전</option></select></Field>
      </>}
      <p className="help">날짜만 기한은 오늘 마감·기한 경과로 표시합니다. 시각 알림은 일시 기한에서 직접 설정한 경우 앱 실행 중에만 표시합니다.</p>
      <Field label="작업 내용"><textarea rows={6} maxLength={20000} value={draft.body} onChange={(e) => patch({ body: e.target.value })} /></Field>
      {!draft.id && !source && <Empty>사업이나 기한 없이 제목만으로 등록할 수 있습니다.</Empty>}
    </form>
  </EditorDialog>;
}
