// AX 사업 보고서 초안 (TASK-AXDESK-03, docs/specs/modular-ax/implementation.md 5장 '보고서 초안').
// A fixed template filled only from the saved project: sections 사업개요·추진배경·추진실적·향후계획.
// Anything the record does not hold is left as "[작성 필요]"; nothing (results, figures, laws,
// confirmed facts) is made up, and nothing calls an AI. The preview and the saved file both come
// from buildAxReport, so they cannot differ. Pure: no DOM, Electron or network.
import { AX_STAGES, AX_ZONES, executionRate } from "./ax.mjs";
import { validDateKey } from "./dates.mjs";

export const TODO = "[작성 필요]";
export const AX_REPORT_FORMATS = { txt: "텍스트(TXT)", md: "마크다운(MD)" };
const REQUEST_KEYS = ["projectId", "format"];

const won = (n) => `${n.toLocaleString("ko-KR", { maximumFractionDigits: 3 })}천원`;
const percent = (rate) => `${(rate * 100).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}%`;
const or = (text, missing) => (text && text.trim() ? text.trim() : `${TODO} ${missing}`);

/** Throws unless the request names an existing project and a known format, and nothing else. */
export function checkAxReportRequest(data, request) {
  if (!request || typeof request !== "object" || Array.isArray(request) || Object.keys(request).some((k) => !REQUEST_KEYS.includes(k)))
    throw new Error("보고서 초안 요청을 확인하세요.");
  if (!Object.hasOwn(AX_REPORT_FORMATS, request.format)) throw new Error("보고서 형식은 TXT 또는 MD만 고를 수 있습니다.");
  const project = typeof request.projectId === "string" ? (data.axProjects ?? []).find((p) => p.id === request.projectId) : undefined;
  if (!project) throw new Error("보고서를 만들 사업을 찾을 수 없습니다. 목록을 새로 고친 뒤 다시 고르세요.");
  return project;
}

/**
 * A file name Windows accepts: no \ / : * ? " < > | or control characters, no trailing dot or
 * space, no reserved device names, at most 60 characters of the title.
 */
export function safeFileTitle(title) {
  let name = title
    .replace(/[\u0000-\u001f\u007f\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60)
    .replace(/[. ]+$/, "");
  if (!name || /^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i.test(name)) name = "AX사업";
  return name;
}

/** Report lines as [kind, text]: "title", "note", "section", "item", "blank". */
function reportLines(project, date) {
  const rate = executionRate(project);
  const budget = project.budgetTotal
    ? won(project.budgetTotal)
    : `${TODO} 사업비(앱에 예산 미등록)`;
  const execution =
    rate === null
      ? `집행액 ${won(project.budgetExecuted)} (사업비 미등록이라 집행률 계산 안 함)`
      : `집행액 ${won(project.budgetExecuted)}, 집행률 ${percent(rate)}${rate > 1 ? ` (사업비보다 ${won(project.budgetExecuted - project.budgetTotal)} 많음 — 확인 필요)` : ""}`;
  const milestone = project.nextMilestone.trim()
    ? `${project.nextMilestone.trim()}${project.nextMilestoneDate ? ` (${project.nextMilestoneDate})` : ` (${TODO} 날짜)`}`
    : `${TODO} 다음 단계와 일정`;
  const lines = [
    ["title", `AX 사업 보고서 초안 — ${project.title}`],
    ["note", `작성 기준일 ${date} · 공원 업무 수첩에 기록한 사업 정보만으로 채운 추천 구조입니다.`],
    ["note", `공식 서식이 아니며 AI가 만든 문서가 아닙니다. ${TODO} 칸과 수치는 원 자료로 확인해 채우세요.`],
    ["blank"],
    ["section", "1. 사업개요"],
    ["item", `사업명: ${project.title}`],
    ["item", `권역: ${AX_ZONES[project.zone]}`],
    ["item", `현재 단계: ${AX_STAGES[project.stage]}`],
    ["item", `사업비: ${budget}`],
    ["item", `담당: ${or(project.manager, "담당 부서·담당자")}`],
    ["item", `협력기관: ${or(project.partner, "수행·협력 기관")}`],
    ["item", `${TODO} 사업 기간과 주요 내용`],
    ["blank"],
    ["section", "2. 추진배경"],
    ["item", `${TODO} 추진 필요성과 근거(관련 계획·지침 이름은 원문으로 확인)`],
    ...(project.notes.trim() ? [["item", `참고 — 앱에 기록한 메모: ${project.notes.trim()}`]] : []),
    ["blank"],
    ["section", "3. 추진실적"],
    ["item", `단계: ${AX_STAGES[project.stage]}`],
    ["item", `예산 집행: ${execution}`],
    ["item", `${TODO} 주요 성과·산출물(수치는 근거 자료로 확인)`],
    ["blank"],
    ["section", "4. 향후계획"],
    ["item", `차기 마일스톤: ${milestone}`],
    ["item", `위험·이슈: ${or(project.risks, "예상 위험과 대응 방안")}`],
    ["item", `${TODO} 향후 추진 일정과 필요 지원`],
  ];
  const todo = lines.filter(([kind, text]) => kind === "item" && text.includes(TODO)).length;
  return [...lines, ["blank"], ["note", `${TODO} 항목 ${todo}곳을 채운 뒤 사용하세요.`]];
}

/** Multi-line user text stays inside its item: following lines are indented. */
const indent = (text, pad) => text.split(/\r?\n/).join(`\n${pad}`);

/**
 * { filename, content } for one project. `date` is the writing date (YYYY-MM-DD) shown in the
 * report and the file name. Content has no BOM (the writer decides).
 */
export function buildAxReport(data, request, date) {
  const project = checkAxReportRequest(data, request);
  if (!validDateKey(date)) throw new Error("작성 기준일을 확인하세요.");
  const md = request.format === "md";
  const content =
    reportLines(project, date)
      .map(([kind, text], index, all) => {
        if (kind === "blank") return "";
        // Back-to-back Markdown quote lines would merge into one paragraph.
        if (md && kind === "note" && all[index - 1]?.[0] === "note") return `>\n> ${text}`;
        if (kind === "title") return md ? `# ${text}` : `${text}\n${"=".repeat(30)}`;
        if (kind === "section") return md ? `## ${text}` : text;
        if (kind === "note") return md ? `> ${text}` : text;
        return md ? `- ${indent(text, "  ")}` : `  - ${indent(text, "    ")}`;
      })
      .join("\n") + "\n";
  return { filename: `AX사업보고서초안-${safeFileTitle(project.title)}-${date}.${request.format}`, content };
}
