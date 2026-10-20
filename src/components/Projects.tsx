import { useState } from "react";
import type { AxProject, AxStage, AxZone, Data, Page, Project, ProjectField, ProjectStage, Save } from "../types";
import { searchText, matches } from "../../shared/search.mjs";
import { listProjects, PROJECT_FIELDS, PROJECT_STAGES, type ProjectView } from "../../shared/projects.mjs";
import { AX_STAGES, AX_ZONES } from "../../shared/ax.mjs";
import { projectFields } from "../../shared/module-contracts.mjs";
import { visibleModules } from "../../shared/applets.mjs";
import { dueText } from "../../shared/work.mjs";
import { Empty, Field, SectionHead, Tag } from "../ui";
import { askConfirm } from "../confirm";
import { EditorDialog, useEditorDraft } from "./EditorDialog";
import { ReferencePicker } from "./ProjectLinks";
import { ReferenceList, References } from "./References";

type Draft = Omit<Project, "field"> & { field: ProjectField; zone: AxZone; axStage: AxStage; budgetTotal: string; budgetExecuted: string; partner: string };
const groups = [
  ["workItems", "작업", "work"], ["tasks", "인수인계·제출", "handover"],
  ["notes", "메모", "notes"], ["calls", "전화", "calls"], ["meetings", "회의", "meetings"], ["patrols", "순찰", "patrol"],
] as const;
type Group = typeof groups[number][0];
const linked = (row: { projectId?: string | null; projectIds?: string[] }, group: Group, id: string) => group === "workItems" || group === "tasks" ? row.projectId === id : (row.projectIds ?? []).includes(id);

export function Projects({ data, save, busy, navigate, initialId }: { data: Data; save: Save; busy: boolean; navigate: (page: Page, id?: string) => void; initialId?: string }) {
  const axEnabled = visibleModules(data).includes("ax-desk");
  const views = listProjects(data, { axEnabled });
  const [selectedId, setSelectedId] = useState(initialId === "new" ? "" : initialId ?? "");
  const selected = views.find((p) => p.id === selectedId);
  const [query, setQuery] = useState("");
  const [field, setField] = useState("all");
  const [limit, setLimit] = useState(100);
  const [referencesOpen, setReferencesOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const blank = (): Draft => ({ id: "", title: "", field: "general", stage: "planning", manager: "", nextMilestone: "", nextMilestoneDate: null, risks: "", notes: "", referenceIds: [], updatedAt: new Date().toISOString(), zone: "hq", axStage: "planning", budgetTotal: "0", budgetExecuted: "0", partner: "" });
  const editor = useEditorDraft(blank(), initialId === "new");
  const { draft, setDraft } = editor;
  const patch = (p: Partial<Draft>) => setDraft({ ...draft, ...p });
  const rows = views.filter((p) => (field === "all" || p.field === field) && matches(searchText.project(p), query));
  function edit(project: ProjectView) {
    const ax = data.axProjects.find((p) => p.id === project.id);
    void editor.openEditor({ ...blank(), ...project, zone: ax?.zone ?? "hq", axStage: ax?.stage ?? "planning", budgetTotal: String(ax?.budgetTotal ?? 0), budgetExecuted: String(ax?.budgetExecuted ?? 0), partner: ax?.partner ?? "" });
  }
  async function saveReferences(ids: string[]) {
    if (!selected) return false;
    return save({ ...data, [selected.store]: data[selected.store].map((p) => p.id === selected.id ? { ...p, referenceIds: ids } : p) });
  }
  if (referencesOpen) return <References data={data} save={save} busy={busy} navigate={navigate} back={() => setReferencesOpen(false)} projectName={selected?.title} attach={selected ? (id) => saveReferences([...new Set([...selected.referenceIds, id])]) : undefined} />;
  return <>
    <div className="projects-toolbar"><button disabled={busy} onClick={() => setReferencesOpen(true)}>전체 근거 관리</button><Tag>사업 {views.length}건</Tag></div>
    <div className="project-workspace">
      <section className="panel project-index" aria-label="사업 목록">
        <SectionHead title="나의 사업"><button className={selected ? "" : "primary"} disabled={busy} onClick={() => editor.openEditor(blank())}>사업 등록</button></SectionHead>
        <input aria-label="사업 검색" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="사업명·담당자·메모 검색" />
        <select aria-label="사업 분야 필터" value={field} onChange={(e) => setField(e.target.value)}><option value="all">전체 분야</option>{Object.entries(PROJECT_FIELDS).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
        <p className="list-count" role="status">{rows.length}건</p>
        <div className="project-choices">{rows.slice(0, limit).map((p) => <button key={p.id} aria-label={`사업 선택 · ${p.title}`} aria-pressed={selectedId === p.id} className={selectedId === p.id ? "selected" : ""} onClick={() => setSelectedId(p.id)}>
          <strong>{p.title}</strong><span>{PROJECT_FIELDS[p.field]} · {PROJECT_STAGES[p.stage]}</span><small>{p.manager || "담당 미지정"}</small>
        </button>)}</div>
        {rows.length > limit && <button onClick={() => setLimit(limit + 100)}>100건 더 보기</button>}
        {!rows.length && <Empty>{query ? "검색 결과가 없습니다." : "사업을 등록하고 관련 기록을 모으세요."}</Empty>}
      </section>
      {selected ? <section className="panel project-detail" aria-label="선택한 사업">
        <SectionHead title={selected.title}><button className="primary" disabled={busy} onClick={() => navigate("work", `project:${selected.id}`)}>작업 등록</button></SectionHead>
        <p><Tag>{PROJECT_FIELDS[selected.field]}</Tag> <Tag>{PROJECT_STAGES[selected.stage]}</Tag> · {selected.manager || "담당 미지정"}</p>
        <div className="record-actions"><button disabled={busy} onClick={() => edit(selected)}>사업 수정</button><button className="text-button danger" disabled={busy} onClick={async () => {
          if (await askConfirm({ message: "이 사업을 삭제할까요?", detail: "연결된 작업·메모·회의·순찰·근거 자료와 원본 파일은 남습니다. 기존 연결은 삭제된 사업으로 표시됩니다.", confirmLabel: "사업 삭제", danger: true })) {
            if (await save({ ...data, [selected.store]: data[selected.store].filter((p) => p.id !== selected.id) })) setSelectedId("");
          }
        }}>사업 삭제</button></div>
        {selected.nextMilestone && <p>다음 마일스톤 · {selected.nextMilestone}{selected.nextMilestoneDate ? ` (${selected.nextMilestoneDate})` : ""}</p>}
        {selected.notes && <p className="record-body">{selected.notes}</p>}{selected.risks && <p className="notice">확인할 사항 · {selected.risks}</p>}
        {projectFields(selected).length > 0 && <dl className="project-module-fields">{projectFields(selected).map((f) => <div key={f.id}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl>}
        <div className="project-section-head"><h3>연결된 작업</h3><button disabled={busy} onClick={() => setLinkOpen(true)}>기록 연결</button></div>
        {data.workItems.filter((w) => w.projectId === selected.id).map((w) => <button key={w.id} className="project-record-link" onClick={() => navigate("work", w.id)}>{w.title}<small>{w.status === "done" ? "완료" : "진행 중"} · {dueText(w)}</small></button>)}
        {data.tasks.filter((t) => t.projectId === selected.id).map((t) => <button key={t.id} className="project-record-link" onClick={() => navigate(t.kind, t.id)}>{t.title}<small>{t.kind === "submission" ? "제출" : "인수인계"} · {t.done ? "완료" : "진행 중"}</small></button>)}
        <h3>회의·전화·순찰 기록</h3>
        {groups.slice(2).flatMap(([group, label, page]) => data[group].filter((r) => (r.projectIds ?? []).includes(selected.id)).map((r) => <button className="project-record-link" key={`${group}:${r.id}`} onClick={() => navigate(page, r.id)}>{r.title}<small>{label}</small></button>))}
        <div className="project-section-head"><h3>근거 자료</h3><button disabled={busy} onClick={() => setReferencesOpen(true)}>근거 연결·등록</button></div>
        <ReferenceList data={data} ids={selected.referenceIds} navigate={navigate} busy={busy} />
        {!selected.referenceIds.length && <p className="compact-empty">공문·파일·폴더·스니펫을 근거로 연결하세요.</p>}
      </section> : <section className="panel project-welcome"><h2>기록에 맥락을 더하세요</h2><p>사업을 고르면 작업·회의·전화·순찰·근거를 한곳에서 볼 수 있습니다.</p><p>AX 모듈을 숨겨도 AX 사업과 작업 연결은 유지됩니다.</p></section>}
    </div>
    {selected && linkOpen && <LinkRecords key={selected.id} project={selected} data={data} save={save} busy={busy} close={() => setLinkOpen(false)} />}
    {editor.isOpen && <EditorDialog title={draft.id ? "사업 수정" : "사업 등록"} busy={busy} dirty={editor.dirty} onClose={editor.finishEditor} error={editor.saveError}>
      <form className="editor" onSubmit={async (e) => {
        e.preventDefault(); if (busy) return;
        const id = draft.id || crypto.randomUUID();
        const common = { id, title: draft.title.trim(), manager: draft.manager, nextMilestone: draft.nextMilestone, nextMilestoneDate: draft.nextMilestoneDate, risks: draft.risks, notes: draft.notes, referenceIds: draft.referenceIds, updatedAt: new Date().toISOString() };
        let next: Data;
        if (draft.field === "ax") {
          const previous = data.axProjects.find((p) => p.id === id);
          const row: AxProject = { ...previous, ...common, zone: draft.zone, stage: draft.axStage, budgetTotal: Number(draft.budgetTotal), budgetExecuted: Number(draft.budgetExecuted), partner: draft.partner };
          next = { ...data, axProjects: previous ? data.axProjects.map((p) => p.id === id ? row : p) : [...data.axProjects, row] };
        } else {
          const previous = data.projects.find((p) => p.id === id);
          const row: Project = { ...previous, ...common, field: draft.field, stage: draft.stage };
          next = { ...data, projects: previous ? data.projects.map((p) => p.id === id ? row : p) : [...data.projects, row] };
        }
        if (await save(next)) { setSelectedId(id); editor.finishEditor(); }
        else editor.setSaveError("저장하지 못했습니다. 입력 내용은 유지됩니다. 필드와 파일 상태를 확인하세요.");
      }}>
        <div className="editor-header-actions"><button className="primary" disabled={busy}>저장</button><button type="button" onClick={editor.closeEditor} disabled={busy}>취소</button></div>
        <Field label="사업명"><input autoFocus required maxLength={200} value={draft.title} onChange={(e) => patch({ title: e.target.value })} /></Field>
        <Field label="사업 분야"><select disabled={!!draft.id && draft.field === "ax"} value={draft.field} onChange={(e) => patch({ field: e.target.value as ProjectField })}>{Object.entries(PROJECT_FIELDS).map(([id, label]) => <option key={id} value={id} disabled={!!draft.id && id === "ax" && draft.field !== "ax"}>{label}</option>)}</select></Field>
        <Field label="사업 단계">{draft.field === "ax" && axEnabled ? <select value={draft.axStage} onChange={(e) => patch({ axStage: e.target.value as AxStage })}>{Object.entries(AX_STAGES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select> : <select value={draft.stage} onChange={(e) => {
          const stage = e.target.value as ProjectStage;
          patch({ stage, ...(draft.field === "ax" ? { axStage: stage === "progress" ? (["execution", "contract"].includes(draft.axStage) ? draft.axStage : "execution") : stage === "done" ? "done" : "planning" } : {}) });
        }}>{Object.entries(PROJECT_STAGES).filter(([id]) => draft.field !== "ax" || id !== "hold").map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>}</Field>
        <Field label="사업 담당자"><input maxLength={100} value={draft.manager} onChange={(e) => patch({ manager: e.target.value })} /></Field>
        <Field label="다음 마일스톤"><input maxLength={500} value={draft.nextMilestone} onChange={(e) => patch({ nextMilestone: e.target.value })} /></Field>
        <Field label="마일스톤 날짜"><input type="date" value={draft.nextMilestoneDate ?? ""} onChange={(e) => patch({ nextMilestoneDate: e.target.value || null })} /></Field>
        {draft.field === "ax" && axEnabled && <>
          <Field label="AX 권역"><select value={draft.zone} onChange={(e) => patch({ zone: e.target.value as AxZone })}>{Object.entries(AX_ZONES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></Field>
          <div className="form-row"><Field label="사업비 (천원)"><input type="number" min="0" step="any" value={draft.budgetTotal} onChange={(e) => patch({ budgetTotal: e.target.value })} /></Field><Field label="집행액 (천원)"><input type="number" min="0" step="any" value={draft.budgetExecuted} onChange={(e) => patch({ budgetExecuted: e.target.value })} /></Field></div>
          <Field label="협력기관"><input maxLength={200} value={draft.partner} onChange={(e) => patch({ partner: e.target.value })} /></Field>
        </>}
        <Field label="확인할 사항"><textarea rows={3} maxLength={4000} value={draft.risks} onChange={(e) => patch({ risks: e.target.value })} /></Field>
        <Field label="사업 메모"><textarea rows={4} maxLength={4000} value={draft.notes} onChange={(e) => patch({ notes: e.target.value })} /></Field>
        <ReferencePicker data={data} value={draft.referenceIds} onChange={(referenceIds) => patch({ referenceIds })} busy={busy} />
      </form>
    </EditorDialog>}
  </>;
}

function LinkRecords({ project, data, save, busy, close }: { project: ProjectView; data: Data; save: Save; busy: boolean; close: () => void }) {
  const [group, setGroup] = useState<Group>("workItems");
  const [query, setQuery] = useState("");
  const rows = data[group].filter((r) => r.title.toLowerCase().includes(query.trim().toLowerCase()));
  return <EditorDialog title="기록 연결" busy={busy} dirty={false} onClose={close} error="">
    <div className="editor"><button onClick={close}>닫기</button>
      <select aria-label="연결할 기록 종류" value={group} onChange={(e) => setGroup(e.target.value as Group)}>{groups.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
      <input aria-label="연결할 기록 검색" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="원본 제목 검색" />
      <p className="help">작업·인수인계는 한 사업에, 메모·전화·회의·순찰은 여러 사업에 연결합니다.</p>
      {rows.slice(0, 100).map((row) => {
        const attached = linked(row, group, project.id);
        return <button key={row.id} disabled={busy} onClick={async () => {
          if (!attached && (group === "tasks" || group === "workItems") && "projectId" in row && row.projectId && row.projectId !== project.id) {
            if (!await askConfirm({ message: "이 작업의 사업을 바꿀까요?", detail: "기존 사업에서 이 사업으로 연결을 옮깁니다. 작업 내용은 유지됩니다.", confirmLabel: "사업 변경" })) return;
          }
          const next = data[group].map((r) => r.id === row.id ? (group === "tasks" || group === "workItems" ? { ...r, projectId: attached ? null : project.id } : { ...r, projectIds: attached ? (r.projectIds ?? []).filter((id) => id !== project.id) : [...(r.projectIds ?? []), project.id] }) : r);
          await save({ ...data, [group]: next });
        }}>{attached ? "연결 해제" : "연결"} · {row.title}</button>;
      })}
      {rows.length > 100 && <p className="help">처음 100건입니다. 검색어로 범위를 좁히세요.</p>}
    </div>
  </EditorDialog>;
}
