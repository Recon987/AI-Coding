import { useState } from "react";
import { AX_STAGES, AX_ZONES, executionRate } from "../../shared/ax.mjs";
import { addLabel, editorTitle, SAVE, TARGET } from "../../shared/labels.mjs";
import { matches, searchText } from "../../shared/search.mjs";
import { dayKey } from "../../shared/model.mjs";
import { confirmDelete } from "../confirm";
import type { AxProject, AxStage, AxZone, Data, Save } from "../types";
import { Empty, Field, SectionHead, Tag } from "../ui";
import { EditorDialog, useEditorDraft } from "./EditorDialog";
import { ListHeader, ListRow, rowKeys } from "./ListRow";

// Amounts are typed as text so an empty box stays empty while editing; saved as numbers.
type Draft = Omit<AxProject, "budgetTotal" | "budgetExecuted"> & { budgetTotal: string; budgetExecuted: string };
type Sort = "milestone" | "updated" | "title" | "rate";
const SORTS: Record<Sort, string> = {
  milestone: "마일스톤 가까운 순",
  updated: "최근 수정 순",
  title: "사업명 순",
  rate: "집행률 높은 순",
};
const won = (n: number) => n.toLocaleString("ko-KR", { maximumFractionDigits: 3 });
const percent = (rate: number) => `${(rate * 100).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}%`;
const parseAmount = (text: string) => (text.trim() === "" ? 0 : Number(text));

/** One-line execution summary. Budget 0 is "예산 미등록", not 0% or a division error. */
export function rateText(p: Pick<AxProject, "budgetTotal" | "budgetExecuted">) {
  const rate = executionRate(p as AxProject);
  if (rate === null) return "예산 미등록";
  return `집행 ${percent(rate)}${rate > 1 ? " (예산 초과)" : ""}`;
}

/**
 * Execution against the budget, in 천원. The bar stops at 100%; the numbers never do, so an
 * overspend stays visible with a warning. Stage (기획…완료) is shown separately: it is not progress.
 */
function Budget({ project }: { project: AxProject }) {
  const rate = executionRate(project);
  if (rate === null)
    return (
      <p className="ax-budget">
        <Tag tone="warning">예산 미등록</Tag> 집행 {won(project.budgetExecuted)}천원
      </p>
    );
  const over = rate > 1;
  return (
    <div className="ax-budget">
      <span className="ax-bar" aria-hidden="true">
        <span className={over ? "over" : ""} style={{ width: `${Math.min(rate, 1) * 100}%` }} />
      </span>
      <span>
        집행 {won(project.budgetExecuted)} / 사업비 {won(project.budgetTotal)}천원 · 집행률 {percent(rate)}
      </span>
      {over && <Tag tone="warning">예산 초과 {won(project.budgetExecuted - project.budgetTotal)}천원</Tag>}
    </div>
  );
}

/** AX 사업 관리 (module "ax-desk", TASK-AXDESK-01): 권역별 사업, 단계, 사업비 집행, 차기 마일스톤. */
export function AxDesk({
  data,
  save,
  busy,
  initialId,
  openReport,
}: {
  data: Data;
  save: Save;
  busy: boolean;
  initialId?: string;
  /** Opens 보고서 초안 with this project chosen. */
  openReport?: (id: string) => void;
}) {
  const blank = (): Draft => ({
    id: "",
    title: "",
    zone: "hq",
    stage: "planning",
    budgetTotal: "",
    budgetExecuted: "",
    manager: "",
    partner: "",
    nextMilestone: "",
    nextMilestoneDate: null,
    risks: "",
    notes: "",
    updatedAt: "",
  });
  const toDraft = (p: AxProject): Draft => ({
    ...p,
    budgetTotal: String(p.budgetTotal),
    budgetExecuted: String(p.budgetExecuted),
  });
  const initial = data.axProjects.find((p) => p.id === initialId);
  const editor = useEditorDraft<Draft>(initial ? toDraft(initial) : blank(), !!initial || initialId === "new");
  const { draft, setDraft } = editor;
  const patch = (values: Partial<Draft>) => setDraft((current) => ({ ...current, ...values }));
  const [zone, setZone] = useState<AxZone | "all">("all");
  const [stage, setStage] = useState<AxStage | "all">("all");
  const [sort, setSort] = useState<Sort>("milestone");
  const [query, setQuery] = useState("");

  const today = dayKey();
  const all = data.axProjects;
  const pastDue = (p: AxProject) => p.stage !== "done" && !!p.nextMilestoneDate && p.nextMilestoneDate < today;
  const zoneCount = (z: AxZone | "all") => (z === "all" ? all.length : all.filter((p) => p.zone === z).length);
  const rows = all
    .filter(
      (p) =>
        (zone === "all" || p.zone === zone) &&
        (stage === "all" || p.stage === stage) &&
        matches(searchText.ax(p), query),
    )
    .sort((a, b) => {
      if (sort === "updated") return b.updatedAt.localeCompare(a.updatedAt);
      if (sort === "title") return a.title.localeCompare(b.title, "ko");
      if (sort === "rate") {
        const ra = executionRate(a) ?? -1;
        const rb = executionRate(b) ?? -1;
        return rb - ra || a.title.localeCompare(b.title, "ko");
      }
      // Milestone: open projects by date (past-due first), then undated, finished projects last.
      return (
        Number(a.stage === "done") - Number(b.stage === "done") ||
        (a.nextMilestoneDate ?? "9999").localeCompare(b.nextMilestoneDate ?? "9999") ||
        a.title.localeCompare(b.title, "ko")
      );
    });
  const filtered = zone !== "all" || stage !== "all" || query.trim() !== "";
  const totals = rows.reduce(
    (sum, p) => ({ budget: sum.budget + p.budgetTotal, executed: sum.executed + p.budgetExecuted }),
    { budget: 0, executed: 0 },
  );

  const total = parseAmount(draft.budgetTotal);
  const executed = parseAmount(draft.budgetExecuted);
  const overspend =
    Number.isFinite(total) && Number.isFinite(executed) && total > 0 && executed > total
      ? `집행액이 사업비보다 ${won(executed - total)}천원 많습니다. 실제 현황이면 그대로 저장하세요.`
      : "";
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const row: AxProject = {
      ...draft,
      id: draft.id || crypto.randomUUID(),
      title: draft.title.trim(),
      budgetTotal: total,
      budgetExecuted: executed,
      manager: draft.manager.trim(),
      partner: draft.partner.trim(),
      nextMilestone: draft.nextMilestone.trim(),
      nextMilestoneDate: draft.nextMilestoneDate || null,
      risks: draft.risks.trim(),
      notes: draft.notes.trim(),
      updatedAt: new Date().toISOString(),
    };
    if (!row.title) return;
    const ok = await save({
      ...data,
      axProjects: draft.id ? all.map((p) => (p.id === draft.id ? row : p)) : [...all, row],
    });
    if (ok) editor.finishEditor();
    else editor.setSaveError("저장하지 못했습니다. 입력 내용은 유지됩니다. 다시 시도하세요.");
  }

  return (
    <div className="workspace-grid">
      <section className="panel records ax-projects">
        <SectionHead eyebrow="AX PROJECTS" title="권역별 AX 사업">
          <div className="editor-header-actions">
            <button className="primary" disabled={busy} onClick={() => editor.openEditor(blank())}>
              {addLabel(TARGET.axProject)}
            </button>
          </div>
        </SectionHead>
        <div className="segmented ax-zone-filter" role="group" aria-label="권역">
          {(["all", ...Object.keys(AX_ZONES)] as (AxZone | "all")[]).map((z) => (
            <button
              key={z}
              type="button"
              aria-pressed={zone === z}
              className={zone === z ? "selected" : ""}
              onClick={() => setZone(z)}
            >
              {z === "all" ? "전체" : AX_ZONES[z]} {zoneCount(z)}
            </button>
          ))}
        </div>
        <div className="list-tools">
          <select aria-label="단계" value={stage} onChange={(e) => setStage(e.target.value as AxStage | "all")}>
            <option value="all">모든 단계</option>
            {Object.entries(AX_STAGES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select aria-label="정렬" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            {Object.entries(SORTS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            aria-label="사업 검색"
            placeholder="사업명, 담당자, 협력기관, 마일스톤 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <p className="list-count ax-summary" role="status" aria-atomic="true">
          {rows.length > 0 &&
            `${filtered ? `${rows.length}건 표시 · ` : ""}사업비 ${won(totals.budget)}천원 · 집행 ${won(totals.executed)}천원`}
        </p>
        {rows.length === 0 && (
          <Empty>
            {all.length ? (
              <>
                조건에 맞는 사업이 없습니다.
                <br />
                <button
                  onClick={() => {
                    setZone("all");
                    setStage("all");
                    setQuery("");
                  }}
                >
                  조건 초기화
                </button>
              </>
            ) : (
              "등록된 AX 사업이 없습니다. 사업을 등록하면 차기 마일스톤이 달력과 브리핑에 표시됩니다."
            )}
          </Empty>
        )}
        <div className="row-list" onKeyDown={rowKeys}>
          {rows.length > 0 && <ListHeader whenLabel="마일스톤" statusLabel="단계" kindLabel="권역" />}
          {rows.map((p) => (
            <ListRow
              key={p.id}
              busy={busy}
              className="ax-record"
              done={p.stage === "done"}
              when={
                pastDue(p) ? (
                  <>
                    {p.nextMilestoneDate} <Tag tone="warning">지남</Tag>
                  </>
                ) : (
                  (p.nextMilestoneDate ?? "—")
                )
              }
              status={<Tag tone={p.stage === "done" ? "" : "ax"}>{AX_STAGES[p.stage]}</Tag>}
              kind={AX_ZONES[p.zone]}
              title={p.title}
              subtitle={[rateText(p), p.nextMilestone].filter(Boolean).join(" · ")}
              owner={p.manager || "—"}
              actions={[
                { label: "수정", onClick: () => editor.openEditor(toDraft(p)) },
                ...(openReport ? [{ label: "보고서", onClick: () => openReport(p.id) }] : []),
                {
                  label: "삭제",
                  tone: "danger" as const,
                  onClick: async () => {
                    if (await confirmDelete(`${p.title} 사업`))
                      await save({ ...data, axProjects: all.filter((x) => x.id !== p.id) });
                  },
                },
              ]}
            >
              <Budget project={p} />
              <dl className="ax-facts">
                <dt>차기 마일스톤</dt>
                <dd>
                  {[p.nextMilestoneDate, p.nextMilestone].filter(Boolean).join(" · ") || "미정"}
                </dd>
                <dt>협력기관</dt>
                <dd>{p.partner || "—"}</dd>
                {p.risks && (
                  <>
                    <dt>위험·이슈</dt>
                    <dd className="record-body">{p.risks}</dd>
                  </>
                )}
                {p.notes && (
                  <>
                    <dt>메모</dt>
                    <dd className="record-body">{p.notes}</dd>
                  </>
                )}
              </dl>
              <p className="source">
                {AX_ZONES[p.zone]} · {AX_STAGES[p.stage]} · 수정 {new Date(p.updatedAt).toLocaleString("ko-KR")}
              </p>
            </ListRow>
          ))}
        </div>
        <p className="muted ax-note">금액 단위는 천원입니다. 개인 업무 관리용 집계이며 공식 회계 자료가 아닙니다.</p>
      </section>
      {editor.isOpen && (
        <EditorDialog
          title={editorTitle(TARGET.axProject, Boolean(draft.id))}
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
              <button type="button" disabled={busy} onClick={editor.closeEditor}>
                취소
              </button>
            </div>
            <p className="editor-intro">
              사업명은 필수입니다. 금액은 천원 단위이며 비우면 0입니다. 차기 마일스톤 날짜를 넣으면 달력과 브리핑에 그날 표시됩니다.
            </p>
            <Field label="사업명">
              <input
                required
                maxLength={200}
                autoFocus
                value={draft.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder="예: 탐방로 혼잡도 AI 분석 실증"
              />
            </Field>
            <div className="form-row">
              <Field label="권역">
                <select value={draft.zone} onChange={(e) => patch({ zone: e.target.value as AxZone })}>
                  {Object.entries(AX_ZONES).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="단계">
                <select value={draft.stage} onChange={(e) => patch({ stage: e.target.value as AxStage })}>
                  {Object.entries(AX_STAGES).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="form-row">
              <Field label="사업비(천원)" hint="0이면 예산 미등록으로 표시">
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={1e9}
                  step="any"
                  value={draft.budgetTotal}
                  onChange={(e) => patch({ budgetTotal: e.target.value })}
                />
              </Field>
              <Field label="집행액(천원)" hint={overspend ? <span className="field-warning">{overspend}</span> : undefined}>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={1e9}
                  step="any"
                  value={draft.budgetExecuted}
                  onChange={(e) => patch({ budgetExecuted: e.target.value })}
                />
              </Field>
            </div>
            <div className="form-row">
              <Field label="담당자">
                <input maxLength={100} value={draft.manager} onChange={(e) => patch({ manager: e.target.value })} />
              </Field>
              <Field label="협력기관">
                <input maxLength={200} value={draft.partner} onChange={(e) => patch({ partner: e.target.value })} />
              </Field>
            </div>
            <div className="form-row">
              <Field label="차기 마일스톤">
                <input
                  maxLength={500}
                  value={draft.nextMilestone}
                  onChange={(e) => patch({ nextMilestone: e.target.value })}
                  placeholder="예: 착수보고회"
                />
              </Field>
              <Field label="마일스톤 날짜" hint="비우면 달력에 표시하지 않음">
                <input
                  type="date"
                  value={draft.nextMilestoneDate ?? ""}
                  onChange={(e) => patch({ nextMilestoneDate: e.target.value || null })}
                />
              </Field>
            </div>
            <Field label="위험·이슈">
              <textarea rows={3} maxLength={4000} value={draft.risks} onChange={(e) => patch({ risks: e.target.value })} />
            </Field>
            <Field label="메모">
              <textarea rows={3} maxLength={4000} value={draft.notes} onChange={(e) => patch({ notes: e.target.value })} />
            </Field>
          </form>
        </EditorDialog>
      )}
    </div>
  );
}
