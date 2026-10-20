import { useState } from "react";
import { listProjects, projectRef, referenceView } from "../../shared/projects.mjs";
import type { Data, Page } from "../types";
import { Field } from "../ui";

export function ProjectSelect({ data, value, onChange, busy }: { data: Data; value: string | null; onChange: (id: string | null) => void; busy: boolean }) {
  const projects = listProjects(data, { axEnabled: false });
  const missing = projectRef(data, value);
  return <Field label="사업"><select disabled={busy} value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
    <option value="">사업 없음</option>
    {missing && !missing.exists && <option value={value!}>사업 없음(삭제됨)</option>}
    {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
  </select></Field>;
}

export function ReferencePicker({ data, value, onChange, busy }: { data: Data; value: string[]; onChange: (ids: string[]) => void; busy: boolean }) {
  const [query, setQuery] = useState("");
  const all = data.references.map((r) => ({ id: r.id, label: referenceView(data, r.id).label }));
  const missing = value.filter((id) => !all.some((r) => r.id === id)).map((id) => ({ id, label: `삭제된 자료 (${id})` }));
  const filtered = [...missing, ...all].filter((r) => r.label.toLowerCase().includes(query.trim().toLowerCase()));
  return <fieldset className="reference-picker">
    <legend>근거 자료 · {value.length}/50</legend>
    <input aria-label="선택할 근거 검색" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="등록된 근거에서 선택" />
    <div className="reference-options">{filtered.slice(0, 50).map((r) => <label key={r.id}>
      <input type="checkbox" aria-label={`근거 선택 · ${r.label}`} checked={value.includes(r.id)} disabled={busy || (!value.includes(r.id) && value.length >= 50)} onChange={(e) => onChange(e.target.checked ? [...value, r.id] : value.filter((id) => id !== r.id))} />
      <span>{r.label}</span>
    </label>)}</div>
    {filtered.length > 50 && <p className="help">처음 50건입니다. 검색어로 범위를 좁히세요.</p>}
    {!all.length && <p className="help">사업 공간의 근거 보관함에 자료를 등록하면 선택할 수 있습니다.</p>}
  </fieldset>;
}

export function LinkedProjects({ data, ids, navigate, busy }: { data: Data; ids: string[]; navigate: (page: Page, id?: string) => void; busy: boolean }) {
  return <div className="record-actions">{ids.map((id) => {
    const p = projectRef(data, id)!;
    return p.exists ? <button key={id} className="text-button" disabled={busy} onClick={() => navigate("projects", id)}>사업 · {p.title}</button> : <span className="source" key={id}>{p.label}</span>;
  })}</div>;
}
