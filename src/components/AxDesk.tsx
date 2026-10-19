import type { Data } from "../types";
import { Empty, SectionHead } from "../ui";

/**
 * AX 사업 관리 (module "ax-desk"). The screen arrives in TASK-AXDESK-01~03; until then it
 * only says what is coming. Records are already kept and validated (TASK-MODULES-01).
 */
export function AxDesk({ data }: { data: Data }) {
  return (
    <section className="panel">
      <SectionHead title="AX 사업 관리" />
      <Empty>
        권역별 AX 사업 관리, GIS·AI 스니펫 보관함, 보고서 초안 화면은 다음 단계에서 이 자리에 들어옵니다.
        <br />
        지금 저장된 사업 {data.axProjects.length}건 · 스니펫 {data.axSnippets.length}건
      </Empty>
    </section>
  );
}
