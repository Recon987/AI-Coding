export const collections = [
  "notes",
  "events",
  "calls",
  "folders",
  "patrols",
  "tasks",
];
export const empty = () => ({
  version: 2,
  notes: [],
  events: [],
  calls: [],
  folders: [],
  patrols: [],
  tasks: [],
});
const string = (v, max = 20000) => typeof v === "string" && v.length <= max;
const required = (v, max = 500) => string(v, max) && v.trim().length > 0;
const timestamp = (v) =>
  string(v, 40) &&
  /^\d{4}-\d{2}-\d{2}T/.test(v) &&
  Number.isFinite(Date.parse(v));
const ensure = (condition, message) => {
  if (!condition) throw new Error(message);
};

// Angular notation only: no datum/projection transformation or network access.
function coordinateLimit(axis) {
  ensure(["latitude", "longitude"].includes(axis), "좌표 축을 확인하세요.");
  return axis === "latitude" ? 90 : 180;
}
function validateDecimal(value, axis) {
  const limit = coordinateLimit(axis);
  ensure(
    Number.isFinite(value) && Math.abs(value) <= limit,
    `${axis === "latitude" ? "위도" : "경도"}는 -${limit}~${limit}도 사이의 숫자여야 합니다.`,
  );
  return value === 0 ? 0 : value;
}
export function validateCoordinates(input) {
  ensure(
    input && typeof input === "object" && !Array.isArray(input),
    "위도와 경도를 함께 입력하세요.",
  );
  return {
    latitude: validateDecimal(input.latitude, "latitude"),
    longitude: validateDecimal(input.longitude, "longitude"),
  };
}
export function decimalToDms(value, axis) {
  value = validateDecimal(value, axis);
  // Round total microarcseconds first so seconds/minutes carry correctly.
  const total = Math.round(Math.abs(value) * 3600 * 1e6);
  const degrees = Math.floor(total / 3600000000);
  const minutes = Math.floor((total % 3600000000) / 60000000);
  const seconds = (total % 60000000) / 1e6;
  return {
    degrees,
    minutes,
    seconds,
    hemisphere:
      axis === "latitude" ? (value < 0 ? "S" : "N") : value < 0 ? "W" : "E",
  };
}
export function dmsToDecimal(input, axis) {
  const limit = coordinateLimit(axis);
  ensure(
    input && typeof input === "object" && !Array.isArray(input),
    "도·분·초를 입력하세요.",
  );
  const { degrees, minutes, seconds, hemisphere } = input;
  ensure(
    Number.isInteger(degrees) && degrees >= 0 && degrees <= limit,
    `도는 0~${limit} 사이의 정수여야 합니다.`,
  );
  ensure(
    Number.isInteger(minutes) && minutes >= 0 && minutes < 60,
    "분은 0~59 사이의 정수여야 합니다.",
  );
  ensure(
    Number.isFinite(seconds) && seconds >= 0 && seconds < 60,
    "초는 0 이상 60 미만이어야 합니다.",
  );
  ensure(
    (axis === "latitude" ? ["N", "S"] : ["E", "W"]).includes(hemisphere),
    "위도는 N/S, 경도는 E/W 방향을 선택하세요.",
  );
  ensure(
    degrees < limit || (minutes === 0 && seconds === 0),
    "위도 90도·경도 180도에서는 분·초가 0이어야 합니다.",
  );
  const value = degrees + minutes / 60 + seconds / 3600;
  return value === 0 ? 0 : ["S", "W"].includes(hemisphere) ? -value : value;
}

// v1 -> v2 is additive and returns a new object without modifying the input.
export function normalize(input) {
  ensure(
    input && typeof input === "object" && [1, 2].includes(input.version),
    "지원하지 않는 데이터 버전입니다.",
  );
  const data =
    input.version === 1
      ? { ...input, version: 2, patrols: [], tasks: [] }
      : input;
  for (const key of collections) {
    ensure(
      Array.isArray(data[key]) && data[key].length <= 10000,
      "데이터 크기 또는 형식을 확인하세요.",
    );
    const ids = new Set();
    for (const row of data[key]) {
      ensure(
        row && required(row.id, 100) && !ids.has(row.id) && required(row.title),
        "항목의 ID 또는 제목을 확인하세요.",
      );
      ids.add(row.id);
      if (["notes", "calls", "tasks"].includes(key))
        ensure(string(row.body), "내용이 너무 길거나 올바르지 않습니다.");
      if (["events", "calls", "tasks"].includes(key))
        ensure(typeof row.done === "boolean", "완료 상태를 확인하세요.");
      if (["events", "patrols", "tasks"].includes(key))
        ensure(timestamp(row.at), "일시 형식을 확인하세요.");
      if (key === "calls")
        ensure(string(row.phone, 100), "전화번호를 확인하세요.");
      if (key === "folders")
        ensure(
          required(row.path, 4096) &&
            /^(\/|[A-Za-z]:[\\/]|\\\\)/.test(row.path),
          "폴더의 절대 경로를 확인하세요.",
        );
      if (key === "patrols") {
        if (row.coordinates !== undefined && row.coordinates !== null)
          validateCoordinates(row.coordinates);
        ensure(
          required(row.route, 500) && required(row.observer, 100),
          "순찰 구간과 기록자를 입력하세요.",
        );
        ensure(
          string(row.findings) && string(row.action),
          "순찰 내용을 확인하세요.",
        );
        ensure(
          ["normal", "attention", "urgent"].includes(row.risk),
          "확인 등급을 확인하세요.",
        );
      }
      if (key === "tasks") {
        ensure(
          ["handover", "submission"].includes(row.kind) &&
            string(row.assignee, 100),
          "업무 구분과 담당자를 확인하세요.",
        );
        ensure(
          string(row.destination, 500) &&
            ["normal", "high"].includes(row.priority),
          "제출처 또는 우선순위를 확인하세요.",
        );
        ensure(
          [0, 60, 1440].includes(row.remindMinutes),
          "알림 설정을 확인하세요.",
        );
        ensure(
          row.patrolId === null || required(row.patrolId, 100),
          "연결된 순찰 ID를 확인하세요.",
        );
        ensure(
          row.completedAt === null || timestamp(row.completedAt),
          "완료 일시를 확인하세요.",
        );
        ensure(
          row.done === (row.completedAt !== null),
          "완료 상태와 완료 일시가 다릅니다.",
        );
      }
    }
  }
  const patrolIds = new Set(data.patrols.map((row) => row.id));
  ensure(
    data.tasks.every(
      (row) => row.patrolId === null || patrolIds.has(row.patrolId),
    ),
    "후속 조치에 연결된 순찰 기록이 없습니다.",
  );
  // Keep only known collections, so unrelated import metadata cannot become application state.
  return {
    version: 2,
    ...Object.fromEntries(collections.map((key) => [key, data[key]])),
  };
}
export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function calendarItems(data) {
  return [
    ...data.events.map((e) => ({
      ...e,
      key: `event:${e.id}`,
      category: "일정",
      page: "calendar",
    })),
    ...data.tasks.map((t) => ({
      ...t,
      key: `task:${t.id}`,
      category: t.kind === "submission" ? "제출" : "인계",
      page: t.kind,
    })),
    ...data.patrols.map((p) => ({
      ...p,
      key: `patrol:${p.id}`,
      category: "순찰",
      page: "patrol",
      done: false,
    })),
  ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}
export function reminderItems(data) {
  return [
    ...data.events.map((e) => ({
      id: `event:${e.id}`,
      title: e.title,
      at: e.at,
      done: e.done,
    })),
    ...data.tasks.map((t) => ({
      id: `task:${t.id}`,
      title: `${t.kind === "submission" ? "제출" : "인수인계"} · ${t.title}`,
      at: new Date(Date.parse(t.at) - t.remindMinutes * 60000).toISOString(),
      done: t.done,
    })),
  ];
}
export function briefing(data, date) {
  ensure(/^\d{4}-\d{2}-\d{2}$/.test(date), "브리핑 날짜를 확인하세요.");
  const when = (value) => new Date(value).toLocaleString("ko-KR");
  const due = data.tasks.filter(
    (t) => !t.done && dayKey(new Date(t.at)) <= date,
  );
  const patrols = data.patrols.filter((p) => dayKey(new Date(p.at)) === date);
  const events = data.events.filter((e) => dayKey(new Date(e.at)) === date);
  return [
    `공원 업무 수첩 | ${date} 업무 브리핑`,
    "개인 기록 기준 · 공식 결재/근무현황 자료 아님",
    "",
    `일정 (${events.length})`,
    ...events.map(
      (e) => `- [${e.done ? "완료" : "예정"}] ${when(e.at)} ${e.title}`,
    ),
    "",
    `순찰 기록 (${patrols.length})`,
    ...patrols.map(
      (p) =>
        `- ${p.title} | ${p.route} | ${p.observer}\n  확인: ${p.findings || "없음"}\n  현장 조치: ${p.action || "없음"}`,
    ),
    "",
    `미완료 인계·제출 (${due.length}, 기준일까지 마감)`,
    ...due.map(
      (t) =>
        `- [${t.kind === "submission" ? "제출" : "인계"}] ${t.title} | 담당: ${t.assignee || "미지정"} | 마감: ${when(t.at)}\n  ${t.body}`,
    ),
    "",
    `미처리 전화 (${data.calls.filter((c) => !c.done).length}, 현재 상태)`,
    ...data.calls.filter((c) => !c.done).map((c) => `- ${c.title}: ${c.body}`),
    "",
    "이 문서는 출력 시점의 기록입니다. 개인정보와 업무자료의 전달 범위를 확인하세요.",
  ].join("\n");
}
