import { useState } from "react";
import type { Data, Save } from "../types";
import { Empty, Field, SectionHead, Tag } from "../ui";
import { Icon } from "./Icon";
type Kind = "organizations" | "employees" | "bases";
const labels = { organizations: "조직", employees: "직원", bases: "거점" };
type Draft = {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  organizationId: string;
  position: string;
  active: boolean;
};
export function OfficeDirectory({
  data,
  save,
  busy,
  kind,
}: {
  data: Data;
  save: Save;
  busy: boolean;
  kind: Kind;
}) {
  const blank = (): Draft => ({
    id: "",
    code: "",
    name: "",
    parentId: null,
    organizationId: data.organizations[0]?.id ?? "",
    position: "",
    active: true,
  });
  const [draft, setDraft] = useState(blank),
    [query, setQuery] = useState("");
  const label = labels[kind];
  const patch = (value: Partial<Draft>) =>
    setDraft((current) => ({ ...current, ...value }));
  const rows = data[kind].filter((r) =>
    `${r.name} ${r.code}`.toLowerCase().includes(query.toLowerCase()),
  );
  const blocked = (id: string) =>
    kind === "employees"
      ? data.assignments.some((a) => a.employeeId === id)
      : kind === "bases"
        ? data.assignments.some((a) => a.baseId === id)
        : data.organizations.some((o) => o.parentId === id) ||
          data.employees.some((e) => e.organizationId === id) ||
          data.bases.some((b) => b.organizationId === id);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const common = {
      id: draft.id || crypto.randomUUID(),
      code: draft.code.trim(),
      name: draft.name.trim(),
    };
    const item =
      kind === "organizations"
        ? { ...common, parentId: draft.parentId }
        : kind === "employees"
          ? {
              ...common,
              organizationId: draft.organizationId,
              position: draft.position.trim(),
              active: draft.active,
            }
          : { ...common, organizationId: draft.organizationId };
    const next = {
      ...data,
      [kind]: draft.id
        ? data[kind].map((r) => (r.id === draft.id ? item : r))
        : [...data[kind], item],
    };
    if (await save(next as Data)) setDraft(blank());
  }
  return (
    <div className="workspace-grid directory-workspace">
      <section className="panel records">
        <SectionHead title={`${label} 목록`}>
          <Tag>{data[kind].length}건</Tag>
        </SectionHead>
        <input
          aria-label={`${label} 검색`}
          placeholder="코드 또는 이름 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {!rows.length && (
          <Empty>
            {kind === "organizations"
              ? "사무소와 부서를 먼저 등록하세요."
              : `${label}를 등록하거나 CSV 파일로 반입하세요.`}
          </Empty>
        )}
        {rows.map((row) => (
          <article className="directory-record" key={row.id}>
            <span className="directory-symbol">
              <Icon
                name={
                  kind === "employees"
                    ? "people"
                    : kind === "bases"
                      ? "patrol"
                      : "organization"
                }
                size={20}
              />
            </span>
            <div>
              <h3>
                {row.name}
                {"active" in row && !row.active && <Tag>비활성</Tag>}
              </h3>
              <p>
                <code>{row.code}</code>
                {"organizationId" in row
                  ? ` · ${data.organizations.find((o) => o.id === row.organizationId)?.name}`
                  : row.parentId
                    ? ` · 상위: ${data.organizations.find((o) => o.id === row.parentId)?.name}`
                    : " · 최상위 조직"}
                {"position" in row && row.position ? ` · ${row.position}` : ""}
              </p>
            </div>
            <div className="directory-actions">
              <button
                disabled={busy}
                aria-label={`${row.name} 수정`}
                onClick={() => setDraft({ ...blank(), ...row })}
              >
                수정
              </button>
              <button
                disabled={busy || blocked(row.id)}
                title={
                  blocked(row.id)
                    ? "연결된 자료가 있어 삭제할 수 없습니다. 직원은 비활성으로 전환할 수 있습니다."
                    : `${label} 삭제`
                }
                aria-label={`${row.name} 삭제`}
                className="text-button danger"
                onClick={async () => {
                  if (
                    confirm(`${row.name} ${label}를 삭제할까요?`) &&
                    (await save({
                      ...data,
                      [kind]: data[kind].filter((r) => r.id !== row.id),
                    }))
                  ) {
                    if (draft.id === row.id) setDraft(blank());
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
        <SectionHead title={`${label} ${draft.id ? "수정" : "등록"}`}>
          <div className="editor-header-actions">
            <button
              className="primary"
              disabled={
                busy || (kind !== "organizations" && !data.organizations.length)
              }
            >
              {label} 저장
            </button>
            {draft.id && (
              <button type="button" onClick={() => setDraft(blank())}>
                취소
              </button>
            )}
          </div>
        </SectionHead>
        <p className="editor-intro">
          {kind === "organizations"
            ? "조직코드는 ERP의 조직코드와 맞추면 이후 반입 자료를 같은 조직에 연결할 수 있습니다."
            : kind === "employees"
              ? "직원번호로 동일 직원을 구분합니다. 동명이인도 서로 다른 직원으로 관리합니다."
              : "탐방지원센터·분소·현장 근무 거점을 등록하세요."}
        </p>
        <Field label={kind === "employees" ? "직원번호" : `${label} 코드`}>
          <input
            required
            maxLength={80}
            value={draft.code}
            onChange={(e) => patch({ code: e.target.value })}
          />
        </Field>
        <Field label={kind === "employees" ? "직원 이름" : `${label} 이름`}>
          <input
            required
            maxLength={120}
            value={draft.name}
            onChange={(e) => patch({ name: e.target.value })}
          />
        </Field>
        {kind === "organizations" ? (
          <Field label="상위 조직">
            <select
              value={draft.parentId ?? ""}
              onChange={(e) => patch({ parentId: e.target.value || null })}
            >
              <option value="">없음 · 최상위 조직</option>
              {data.organizations
                .filter((o) => o.id !== draft.id)
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.code})
                  </option>
                ))}
            </select>
          </Field>
        ) : (
          <Field label="소속 조직">
            <select
              required
              value={draft.organizationId}
              onChange={(e) => patch({ organizationId: e.target.value })}
            >
              <option value="">조직 선택</option>
              {data.organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.code})
                </option>
              ))}
            </select>
          </Field>
        )}
        {kind === "employees" && (
          <>
            <Field label="직위·담당">
              <input
                maxLength={100}
                value={draft.position}
                onChange={(e) => patch({ position: e.target.value })}
              />
            </Field>
            <Field label="직원 사용 상태">
              <select
                value={draft.active ? "active" : "inactive"}
                onChange={(e) => patch({ active: e.target.value === "active" })}
              >
                <option value="active">활성 · 근무표에 표시</option>
                <option value="inactive">비활성 · 기존 근무 기록 보존</option>
              </select>
            </Field>
            <p className="help">
              전출·퇴사 직원은 삭제 대신 비활성으로 전환하면 과거 근무 기록을
              보존합니다.
            </p>
          </>
        )}
      </form>
    </div>
  );
}
