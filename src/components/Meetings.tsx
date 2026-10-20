import { useState } from "react";
import type { Data, Meeting, Page, Save } from "../types";
import { Empty, Field, formatTime, localInput, SectionHead, Tag } from "../ui";
import { EditorDialog, useEditorDraft } from "./EditorDialog";
import { ListRow, rowKeys } from "./ListRow";
import { FollowUpPanel, FollowUpSummary, followUpId } from "./Work";
import { confirmDelete } from "../confirm";
import { matches, searchText } from "../../shared/search.mjs";

export function Meetings({ data, save, busy, navigate, initialId }: { data: Data; save: Save; busy: boolean; navigate: (page: Page, id?: string) => void; initialId?: string }) {
  const blank = (): Meeting => { const now = new Date().toISOString(); return { id: "", title: "", body: "", at: now, attendees: "", createdAt: now, updatedAt: now }; };
  const initial = data.meetings.find((m) => m.id === initialId);
  const editor = useEditorDraft(initial ?? blank(), !!initial || initialId === "new");
  const { draft, setDraft } = editor;
  const [query, setQuery] = useState("");
  const patch = (p: Partial<Meeting>) => setDraft({ ...draft, ...p });
  const rows = data.meetings.filter((m) => matches(searchText.meeting(m), query)).sort((a, b) => b.at.localeCompare(a.at));
  return <div className="workspace-grid">
    <section className="panel records">
      <SectionHead title="회의 기록"><div className="editor-header-actions"><Tag>{data.meetings.length}건</Tag><button className="primary" disabled={busy} onClick={() => editor.openEditor(blank())}>회의 기록 등록</button></div></SectionHead>
      <input aria-label="회의 검색" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="제목·참석자·내용 검색" />
      {!rows.length && <Empty>회의에서 결정한 내용과 후속 작업을 남기세요.</Empty>}
      <div className="row-list" onKeyDown={rowKeys}>{rows.map((m) => <ListRow key={m.id} busy={busy} title={m.title} subtitle={<>{m.body}<FollowUpSummary data={data} source={{ type: "meeting", id: m.id }} /></>} when={formatTime(m.at)} kind="회의" owner={m.attendees || "참석자 미기재"} actions={[
        { label: "+ 후속 작업", onClick: () => navigate("work", followUpId({ type: "meeting", id: m.id })) },
        { label: "수정", onClick: () => { void editor.openEditor(m); } },
        { label: "삭제", tone: "danger", onClick: async () => { if (await confirmDelete("이 회의 기록")) await save({ ...data, meetings: data.meetings.filter((r) => r.id !== m.id) }); } },
      ]}><p className="record-body">{m.body || "내용 없음"}</p><FollowUpPanel data={data} source={{ type: "meeting", id: m.id }} navigate={navigate} busy={busy} /></ListRow>)}</div>
    </section>
    {editor.isOpen && <EditorDialog title={draft.id ? "회의 기록 수정" : "회의 기록 등록"} busy={busy} dirty={editor.dirty} onClose={editor.finishEditor} error={editor.saveError}>
      <form className="editor" onSubmit={async (e) => {
        e.preventDefault();
        if (busy || !draft.title.trim()) return;
        const row = { ...draft, id: draft.id || crypto.randomUUID(), title: draft.title.trim(), updatedAt: new Date().toISOString() };
        if (await save({ ...data, meetings: draft.id ? data.meetings.map((m) => m.id === draft.id ? row : m) : [...data.meetings, row] })) editor.finishEditor();
        else editor.setSaveError("저장하지 못했습니다. 입력 내용은 유지됩니다. 다시 시도하세요.");
      }}>
        <div className="editor-header-actions"><button className="primary" disabled={busy}>저장</button><button type="button" disabled={busy} onClick={editor.closeEditor}>취소</button></div>
        <Field label="회의 제목"><input required autoFocus maxLength={500} value={draft.title} onChange={(e) => patch({ title: e.target.value })} /></Field>
        <Field label="회의 일시"><input required type="datetime-local" value={localInput(draft.at)} onChange={(e) => { if (e.target.value) patch({ at: new Date(e.target.value).toISOString() }); }} /></Field>
        <Field label="참석자"><input maxLength={2000} value={draft.attendees} onChange={(e) => patch({ attendees: e.target.value })} /></Field>
        <Field label="회의 내용"><textarea rows={7} maxLength={20000} value={draft.body} onChange={(e) => patch({ body: e.target.value })} /></Field>
      </form>
    </EditorDialog>}
  </div>;
}
