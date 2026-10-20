import { useMemo, useState } from "react";
import { AX_REPORT_FORMATS, buildAxReport, type AxReportFormat } from "../../shared/ax-report.mjs";
import { AX_ZONES } from "../../shared/ax.mjs";
import { dayKey } from "../../shared/model.mjs";
import type { Data } from "../types";
import { Empty, Field, SectionHead } from "../ui";

/**
 * 보고서 초안 (module "ax-desk", TASK-AXDESK-03): one project's record poured into a fixed
 * four-section structure. Not an official form and not AI: missing parts stay "[작성 필요]".
 * The file is written by the main process from saved data (export-ax-report); the renderer
 * only names the project and the format.
 */
export function AxReport({ data, busy, initialId }: { data: Data; busy: boolean; initialId?: string }) {
  const projects = [...data.axProjects].sort((a, b) => a.title.localeCompare(b.title, "ko"));
  const [projectId, setProjectId] = useState(
    projects.some((p) => p.id === initialId) ? (initialId as string) : (projects[0]?.id ?? ""),
  );
  const [format, setFormat] = useState<AxReportFormat>("txt");
  const [status, setStatus] = useState("");
  const today = dayKey();
  const preview = useMemo(() => {
    try {
      return { ...buildAxReport(data, { projectId, format }, today), error: "" };
    } catch (error) {
      return { filename: "", content: "", error: error instanceof Error ? error.message : "보고서 초안을 만들지 못했습니다." };
    }
  }, [data, projectId, format, today]);
  const api = window.workdesk;

  async function copy() {
    try {
      await navigator.clipboard.writeText(preview.content);
      setStatus("보고서 초안을 복사했습니다. 문서에 붙여 넣은 뒤 [작성 필요] 칸을 채우세요.");
    } catch {
      setStatus("복사하지 못했습니다. 파일로 저장하거나 미리보기를 직접 선택해 복사하세요.");
    }
  }
  async function saveFile() {
    setStatus("");
    try {
      if (await api?.exportAxReport({ projectId, format }))
        setStatus(`보고서 초안을 ${format.toUpperCase()} 파일로 저장했습니다.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "파일을 저장하지 못했습니다.");
    }
  }

  if (!projects.length)
    return (
      <section className="panel">
        <SectionHead eyebrow="REPORT DRAFT" title="보고서 초안" />
        <Empty>등록된 AX 사업이 없습니다. 'AX 사업 관리'에서 사업을 먼저 등록하면 그 정보로 초안을 만듭니다.</Empty>
      </section>
    );
  return (
    <section className="panel ax-report">
      <SectionHead eyebrow="REPORT DRAFT" title="보고서 초안">
        <div className="editor-header-actions">
          <button className="primary" disabled={busy || !api || !!preview.error} onClick={saveFile}>
            파일로 저장
          </button>
          <button disabled={!!preview.error} onClick={copy}>
            초안 복사
          </button>
        </div>
      </SectionHead>
      <p className="notice">
        보고서 초안·추천 구조입니다. 공식 서식이 아니며 온라인 AI를 쓰지 않습니다. 등록한 사업 정보만 채우고, 기록에 없는 성과·수치·근거는
        지어내지 않고 [작성 필요]로 남깁니다.
      </p>
      <div className="form-row">
        <Field label="사업">
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({AX_ZONES[p.zone]})
              </option>
            ))}
          </select>
        </Field>
        <Field label="형식" hint={!api ? "파일 저장은 데스크톱 앱에서 지원합니다." : undefined}>
          <select value={format} onChange={(e) => setFormat(e.target.value as AxReportFormat)}>
            {Object.entries(AX_REPORT_FORMATS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <p className="list-count" role="status" aria-atomic="true">
        {status}
      </p>
      {preview.error ? (
        <p className="error" role="alert">
          {preview.error}
        </p>
      ) : (
        <>
          <h3 className="report-filename">{preview.filename}</h3>
          <pre className="snippet-code report-preview" tabIndex={0} aria-label="보고서 초안 미리보기">
            {preview.content}
          </pre>
        </>
      )}
    </section>
  );
}
