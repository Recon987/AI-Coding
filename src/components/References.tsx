import { useEffect, useState } from "react";
import type { Data, Page, Reference, ReferenceKind, Save } from "../types";
import { searchText, matches } from "../../shared/search.mjs";
import { REFERENCE_KINDS, referenceView } from "../../shared/projects.mjs";
import { Field, SectionHead, Tag } from "../ui";
import { EditorDialog, useEditorDraft } from "./EditorDialog";
import { askConfirm } from "../confirm";

export function ReferenceLocation({ id, path }: { id: string; path: string | null }) {
  const [status, setStatus] = useState<{ state: string; message?: string }>({ state: "checking" });
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    if (!path) return;
    if (!window.workdesk) { setStatus({ state: "unavailable", message: "위치 확인은 데스크톱 앱에서 사용할 수 있습니다." }); return; }
    window.workdesk?.referenceStatus(id).then((next) => { if (live) setStatus(next); }).catch(() => { if (live) setStatus({ state: "unavailable", message: "파일 위치를 확인할 수 없습니다." }); });
    return () => { live = false; };
  }, [id, path, refresh]);
  if (!path) return null;
  return <div className="reference-location">
    <p className="source">{path}</p>
    {status.message && <p role="status">{status.message}</p>}
    <button type="button" disabled={status.state !== "ready"} onClick={async () => {
      try { await window.workdesk?.revealReference(id); setError(""); }
      catch { setError("위치를 표시하지 못했습니다. 파일·폴더 경로를 확인하세요."); setRefresh((n) => n + 1); }
    }}>위치 보기</button>
    <button type="button" className="text-button" onClick={() => setRefresh((n) => n + 1)}>위치 다시 확인</button>
    {error && <p className="notice error" role="alert">{error}</p>}
  </div>;
}

export function ReferenceList({ data, ids, navigate, busy }: { data: Data; ids: string[]; navigate: (page: Page, id?: string) => void; busy: boolean }) {
  return <div className="reference-list">{ids.map((id) => {
    const view = referenceView(data, id);
    const row = data.references.find((r) => r.id === id);
    return <article key={id} className="reference-card">
      <strong>{view.label}</strong>
      {view.exists && <><Tag>{view.kindLabel}</Tag>{view.docNo && <p>문서번호 · {view.docNo}</p>}
        {row?.note && <p className="record-body">{row.note}</p>}
        <ReferenceLocation id={id} path={view.path} />
        {row?.kind === "snippet" && !view.targetMissing && <button disabled={busy} onClick={() => navigate("ax-snippets", row.targetId!)}>원본 스니펫</button>}
      </>}
    </article>;
  })}</div>;
}

export function References({ data, save, busy, navigate, back, attach, projectName, initialId }: { data: Data; save: Save; busy: boolean; navigate: (page: Page, id?: string) => void; back: () => void; attach?: (id: string) => Promise<boolean>; projectName?: string; initialId?: string }) {
  const blank = (): Reference => ({ id: "", title: "", kind: "docNo", targetId: null, path: null, docNo: "", note: "", addedAt: new Date().toISOString() });
  const editor = useEditorDraft(blank());
  const { draft, setDraft } = editor;
  const patch = (p: Partial<Reference>) => setDraft({ ...draft, ...p });
  const [query, setQuery] = useState(initialId ? data.references.find((r) => r.id === initialId)?.title ?? "" : "");
  const [message, setMessage] = useState("");
  const rows = data.references.filter((r) => matches(searchText.reference(r), query));
  return <section className="panel records">
    <SectionHead title="근거 보관함"><div className="editor-header-actions"><button onClick={back}>사업 공간으로</button><button className="primary" disabled={busy} onClick={() => editor.openEditor(blank())}>근거 자료 등록</button></div></SectionHead>
    <p className="help">같은 근거를 여러 사업과 작업에서 재사용합니다. 파일은 위치만 표시합니다.</p>
    <input aria-label="근거 보관함 검색" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="제목·문서번호·메모 검색" />
    {message && <p className="notice" role="status">{message}</p>}
    {rows.slice(0, 100).map((r) => <div key={r.id}>
      <ReferenceList data={data} ids={[r.id]} navigate={navigate} busy={busy} />
      <div className="record-actions">
        {attach && <button disabled={busy} onClick={async () => { if (await attach(r.id)) setMessage(`${projectName}에 근거 자료를 연결했습니다.`); }}>이 사업에 연결 · {r.title}</button>}
        <button disabled={busy} onClick={() => editor.openEditor(r)}>수정 · {r.title}</button>
        <button className="text-button danger" disabled={busy} onClick={async () => {
          if (await askConfirm({ message: "이 근거 자료를 삭제할까요?", detail: "사업·작업·원본 파일은 남습니다. 기존 참조는 삭제된 자료로 표시됩니다.", confirmLabel: "삭제", danger: true })) await save({ ...data, references: data.references.filter((x) => x.id !== r.id) });
        }}>삭제 · {r.title}</button>
      </div>
    </div>)}
    {!rows.length && <p className="compact-empty">등록된 근거가 없습니다.</p>}
    {rows.length > 100 && <p className="help">처음 100건을 표시합니다. 검색어를 입력하세요.</p>}
    {editor.isOpen && <EditorDialog title={draft.id ? "근거 자료 수정" : "근거 자료 등록"} busy={busy} dirty={editor.dirty} onClose={editor.finishEditor} error={editor.saveError}>
      <form className="editor" onSubmit={async (e) => {
        e.preventDefault(); if (busy) return;
        const item = { ...draft, id: draft.id || crypto.randomUUID(), title: draft.title.trim() };
        if (await save({ ...data, references: draft.id ? data.references.map((r) => r.id === draft.id ? item : r) : [...data.references, item] })) editor.finishEditor();
        else editor.setSaveError("저장하지 못했습니다. 입력 내용은 유지됩니다. 다시 확인하세요.");
      }}>
        <div className="editor-header-actions"><button className="primary" disabled={busy}>저장</button><button type="button" onClick={editor.closeEditor} disabled={busy}>취소</button></div>
        <Field label="근거 이름"><input autoFocus required maxLength={200} value={draft.title} onChange={(e) => patch({ title: e.target.value })} /></Field>
        <Field label="근거 종류"><select value={draft.kind} onChange={(e) => patch({ kind: e.target.value as ReferenceKind, targetId: null, path: null, docNo: e.target.value === "docNo" ? "" : null })}>{Object.entries(REFERENCE_KINDS).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></Field>
        {draft.kind === "docNo" && <Field label="문서번호"><input required maxLength={100} value={draft.docNo ?? ""} onChange={(e) => patch({ docNo: e.target.value })} /></Field>}
        {draft.kind === "file" && <><Field label="파일 경로"><input required maxLength={4096} value={draft.path ?? ""} onChange={(e) => patch({ path: e.target.value })} /></Field><button type="button" disabled={busy || !window.workdesk} onClick={async () => { try { const path = await window.workdesk?.chooseReferenceFile(); if (path) patch({ path }); } catch { editor.setSaveError("파일을 고르지 못했습니다."); } }}>파일 선택</button></>}
        {(draft.kind === "folder" || draft.kind === "snippet") && <Field label={draft.kind === "folder" ? "원본 폴더" : "원본 스니펫"}><select required value={draft.targetId ?? ""} onChange={(e) => patch({ targetId: e.target.value || null })}>
          <option value="">선택하세요</option>
          {draft.targetId && !(draft.kind === "folder" ? data.folders : data.axSnippets).some((r) => r.id === draft.targetId) && <option value={draft.targetId}>원본 없음(기존 연결)</option>}
          {(draft.kind === "folder" ? data.folders : data.axSnippets).map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
        </select></Field>}
        <Field label="근거 메모"><textarea rows={4} maxLength={2000} value={draft.note} onChange={(e) => patch({ note: e.target.value })} /></Field>
      </form>
    </EditorDialog>}
  </section>;
}
