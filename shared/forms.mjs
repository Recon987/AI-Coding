// Recommended (not official) forms built from existing records (TASK-FORMS-01).
// Pure: no DOM, Electron or network. The main process calls this with stored data.
import { formatTime } from "./format.mjs";
import {
  dayKey,
  describeObservations,
  OBSERVATION_OUTCOMES,
  PATROL_KINDS,
  patrolSummary,
} from "./model.mjs";
import { daysInclusive } from "./dates.mjs";
import { validDate } from "./office.mjs";

export const FORMS = {
  "patrol-log": "순찰일지",
  "enforcement-log": "단속·계도 기록",
};
export const FORM_FORMATS = ["txt", "csv"];
const RISK = { normal: "일반 기록", attention: "확인 필요", urgent: "우선 확인" };
const MAX_DAYS = 366;
const NOTICE = "추천 양식 · 공식 서식 아님 · 개인 기록 기준";

const fail = (message) => {
  throw new Error(message);
};
function checkRequest({ form, startDate, endDate, format }) {
  if (typeof form !== "string" || !Object.hasOwn(FORMS, form)) fail("양식 종류를 확인하세요.");
  if (!FORM_FORMATS.includes(format)) fail("출력 형식을 확인하세요.");
  if (!validDate(startDate) || !validDate(endDate)) fail("출력 기간을 확인하세요.");
  if (startDate > endDate) fail("출력 시작일은 종료일보다 앞이어야 합니다.");
  if (daysInclusive(startDate, endDate) > MAX_DAYS) fail(`출력 기간은 ${MAX_DAYS}일 이하로 선택하세요.`);
}

/** Quotes every cell and neutralises spreadsheet formulas in text (=, +, -, @, tab, CR). */
export function csvCell(value) {
  let text = value === null || value === undefined ? "" : String(value);
  // Real numbers (e.g. a negative longitude) stay numeric; text is guarded.
  if (typeof value !== "number" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
const csv = (rows) => rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
const coords = (c) => (c ? [c.latitude, c.longitude] : ["", ""]);

function patrolsIn(data, startDate, endDate) {
  return data.patrols
    .filter((p) => {
      const key = dayKey(new Date(p.at));
      return key >= startDate && key <= endDate;
    })
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}
const followUps = (data, patrol) =>
  data.tasks
    .filter((t) => t.patrolId === patrol.id)
    .map((t) => `${t.title}(${t.done ? "완료" : "진행 중"})`)
    .join(", ");

function patrolLog(data, { startDate, endDate, format }) {
  const patrols = patrolsIn(data, startDate, endDate);
  if (format === "csv")
    return csv([
      ["순찰 일시", "기록자", "순찰 종류", "담당구역", "순찰 구간", "확인 등급", "확인 사항", "현장 조치", "단속·확인 건", "위도", "경도", "후속 업무"],
      ...patrols.map((p) => [
        formatTime(p.at),
        p.observer,
        p.kind ? PATROL_KINDS[p.kind] : "",
        p.zone ?? "",
        p.route,
        RISK[p.risk],
        p.findings,
        p.action,
        describeObservations(p.observations),
        ...coords(p.coordinates),
        followUps(data, p),
      ]),
    ]);
  const count = (key, labels) => {
    const totals = new Map();
    for (const p of patrols) {
      const label = p[key] ? labels[p[key]] : "미지정";
      totals.set(label, (totals.get(label) ?? 0) + 1);
    }
    return [...totals].map(([label, n]) => `${label} ${n}`).join(", ") || "없음";
  };
  return [
    `순찰일지 | ${startDate} ~ ${endDate}`,
    NOTICE,
    "",
    ...patrols.flatMap((p, index) => [
      `${index + 1}. ${formatTime(p.at)} | ${p.observer}${p.kind ? ` | ${PATROL_KINDS[p.kind]}` : ""}${p.zone ? ` | 담당구역 ${p.zone}` : ""} | ${RISK[p.risk]}`,
      `   제목: ${p.title}`,
      `   구간: ${p.route}`,
      `   확인 사항: ${p.findings || "없음"}`,
      `   현장 조치: ${p.action || "없음"}`,
      ...(p.observations?.length ? [`   단속·확인: ${describeObservations(p.observations)}`] : []),
      ...(p.coordinates ? [`   위치: 위도 ${p.coordinates.latitude}, 경도 ${p.coordinates.longitude}`] : []),
      ...(followUps(data, p) ? [`   후속 업무: ${followUps(data, p)}`] : []),
      "",
    ]),
    ...(patrols.length ? [] : ["이 기간에 순찰 기록이 없습니다.", ""]),
    `요약: 순찰 ${patrols.length}건`,
    `- 순찰 종류: ${count("kind", PATROL_KINDS)}`,
    `- 확인 등급: ${count("risk", RISK)}`,
  ].join("\n") + "\n";
}

function enforcementLog(data, { startDate, endDate, format }) {
  const rows = patrolsIn(data, startDate, endDate).flatMap((p) =>
    (p.observations ?? []).map((o) => ({ p, o, at: o.coordinates ?? p.coordinates ?? null })),
  );
  if (format === "csv")
    return csv([
      ["일시", "담당구역", "순찰 구간", "기록자", "유형", "건수", "조치", "위도", "경도", "메모"],
      ...rows.map(({ p, o, at }) => [
        formatTime(p.at),
        p.zone ?? "",
        p.route,
        p.observer,
        o.type,
        o.count,
        OBSERVATION_OUTCOMES[o.outcome],
        ...coords(at),
        o.note,
      ]),
    ]);
  const summary = patrolSummary(data, { startDate, endDate });
  return [
    `단속·계도 기록 | ${startDate} ~ ${endDate}`,
    NOTICE,
    "위반자 인적사항과 과태료 금액은 이 앱에 기록하지 않습니다.",
    "",
    ...rows.map(
      ({ p, o, at }, index) =>
        `${index + 1}. ${formatTime(p.at)}${p.zone ? ` | 담당구역 ${p.zone}` : ""} | ${o.type} ${o.count}건 | ${OBSERVATION_OUTCOMES[o.outcome]} | ${p.observer}\n   구간: ${p.route}${at ? `\n   위치: 위도 ${at.latitude}, 경도 ${at.longitude}` : ""}${o.note ? `\n   메모: ${o.note}` : ""}`,
    ),
    ...(rows.length ? [] : ["이 기간에 단속·확인 건이 없습니다."]),
    "",
    `유형별 합계 (총 ${summary.totalCount}건)`,
    ...summary.observations.map(
      (r) => `- ${r.type}: ${r.count}건 (계도 ${r.guidance}, 과태료 부과 ${r.fine}, 기타 ${r.other})`,
    ),
  ].join("\n") + "\n";
}

/** Returns { filename, content }; content has no BOM (the writer adds it). */
export function buildForm(data, request) {
  checkRequest(request);
  const content =
    request.form === "patrol-log" ? patrolLog(data, request) : enforcementLog(data, request);
  return {
    filename: `${FORMS[request.form].replace(/·/g, "-")}-${request.startDate}_${request.endDate}.${request.format}`,
    content,
  };
}
