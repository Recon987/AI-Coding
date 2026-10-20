// 내장 모듈 계약 1판. 포장된 순수 함수만 등록하며 외부 코드를 로드하지 않는다.
import { AX_STAGES, AX_ZONES, milestoneItems } from "./ax.mjs";

export const MODULE_CONTRACTS = [{
  id: "ax", contract: 1,
  fields: {
    project(view) {
      const ax = view.ext?.ax;
      if (!ax) return [];
      const amount = (n) => n.toLocaleString("ko-KR", { maximumFractionDigits: 3 });
      return [
        { id: "zone", label: "권역", value: AX_ZONES[ax.zone] },
        { id: "stage", label: "AX 단계", value: AX_STAGES[ax.axStage] },
        { id: "budget", label: "사업비 / 집행액", value: `${amount(ax.budgetTotal)} / ${amount(ax.budgetExecuted)} 천원` },
        { id: "rate", label: "집행률", value: ax.budgetTotal === 0 ? "미등록" : `${(ax.budgetExecuted / ax.budgetTotal * 100).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}%` },
      ];
    },
  },
  deadlines(data, range) { return milestoneItems(data.axProjects, range); },
  briefing(data, date) {
    const rows = (data.axProjects ?? []).filter((p) => p.nextMilestoneDate === date);
    return rows.length ? [
      `AX 사업 마일스톤 (${rows.length})`,
      ...rows.map((p) => `- ${p.title} | ${p.nextMilestone.trim() || "차기 마일스톤"} | ${AX_ZONES[p.zone]} | ${AX_STAGES[p.stage]}`),
      "",
    ] : [];
  },
}];

// 모듈 숨김은 보기 설정이다. 원본 기한·브리핑은 숨겨도 보존한다.
export const moduleDeadlines = (data, range = {}) => MODULE_CONTRACTS.flatMap((m) => m.deadlines(data, range));
export const moduleBriefing = (data, date) => MODULE_CONTRACTS.flatMap((m) => m.briefing(data, date));
export const projectFields = (view) => MODULE_CONTRACTS.flatMap((m) => m.fields.project(view));
