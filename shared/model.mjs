import { formatTime } from "./format.mjs";
import { officeCollections, validateOffice, validDate } from "./office.mjs";
const personalCollections = [
  "notes",
  "events",
  "calls",
  "folders",
  "patrols",
  "tasks",
];
// Added after v3 shipped; files without it load as an empty list (TASK-CONTROL-01).
const optionalCollections = ["controls"];
export const collections = [
  ...personalCollections,
  ...optionalCollections,
  ...officeCollections,
];
export const CONTROL_REASONS = {
  fire: "산불 예방",
  weather: "기상특보",
  construction: "공사·정비",
  resource: "자원 보호",
  other: "기타",
};
export const RECURRENCE = ["none", "daily", "weekly", "monthly", "yearly"];
export const RECURRENCE_LABEL = {
  none: "반복 없음",
  daily: "매일",
  weekly: "매주",
  monthly: "매월",
  yearly: "매년",
};
// Patrol kinds and observation outcomes are optional v3 fields (TASK-PATROL-02).
export const PATROL_KINDS = {
  safety: "안전 순찰",
  resource: "자원보전 순찰",
  enforcement: "단속",
  fire: "산불 감시",
  facility: "시설 점검",
  incident: "사고 대응",
  general: "일반 순찰",
};
export const OBSERVATION_OUTCOMES = {
  guidance: "계도",
  fine: "과태료 부과",
  other: "기타 조치",
};
// Suggestions only: people may type any type; fine amounts are never stored.
export const DEFAULT_OBSERVATION_TYPES = [
  "샛길·출입금지구역 출입",
  "지정 장소 외 취사",
  "흡연",
  "지정 장소 외 야영",
  "음주",
  "불법 주차",
  "오물·폐기물 투기",
  "임산물 채취",
  "반려동물 동반",
  "안전시설 파손",
];
const MAX_OBSERVATIONS = 50;
export const empty = () => ({
  version: 3,
  notes: [],
  events: [],
  calls: [],
  folders: [],
  patrols: [],
  tasks: [],
  controls: [],
  organizations: [],
  employees: [],
  bases: [],
  assignments: [],
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

// Local occurrence dates are additive v3 metadata; do not add defaults to old data.
function validateOccurrenceMetadata(event) {
  for (const key of ["completedDates", "excludedDates"]) {
    if (event[key] === undefined) continue;
    ensure(
      event.recurrence && event.recurrence !== "none" && RECURRENCE.includes(event.recurrence),
      "회차별 완료·제외일은 반복 일정에만 설정할 수 있습니다.",
    );
    const dates = event[key];
    ensure(
      Array.isArray(dates) && dates.length <= 10000,
      "회차별 완료·제외일은 각각 10,000개 이하의 날짜 목록이어야 합니다.",
    );
    ensure(dates.every(validDate), "회차별 완료·제외일은 실제 날짜여야 합니다.");
    ensure(new Set(dates).size === dates.length, "회차별 완료·제외일에 중복 날짜가 있습니다.");
  }
}

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

export function formatCoordinates(input, format = "dd") {
  const value = validateCoordinates(input);
  ensure(["dd", "dms"].includes(format), "좌표 표시 형식을 확인하세요.");
  if (format === "dd")
    return `위도 ${value.latitude}°, 경도 ${value.longitude}°`;
  return ["latitude", "longitude"]
    .map((axis) => {
      const dms = decimalToDms(value[axis], axis);
      return `${dms.hemisphere} ${dms.degrees}° ${dms.minutes}′ ${dms.seconds}″`;
    })
    .join(", ");
}

export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// v1/v2 -> v3 is additive and returns a new object without modifying the input.
export function normalize(input) {
  ensure(
    input && typeof input === "object" && [1, 2, 3].includes(input.version),
    "지원하지 않는 데이터 버전입니다.",
  );
  const personal =
    input.version === 1 ? { ...input, patrols: [], tasks: [] } : input;
  const data =
    input.version < 3
      ? {
          ...personal,
          version: 3,
          organizations: [],
          employees: [],
          bases: [],
          assignments: [],
        }
      : input;
  validateOffice(data);
  const controls = data.controls === undefined ? [] : data.controls;
  ensure(
    Array.isArray(controls) && controls.length <= 10000,
    "통제 기록은 10,000건 이하의 목록이어야 합니다.",
  );
  const controlIds = new Set();
  for (const row of controls) {
    ensure(
      row && required(row.id, 100) && !controlIds.has(row.id) && required(row.title),
      "통제 구간과 ID를 확인하세요.",
    );
    controlIds.add(row.id);
    ensure(Object.hasOwn(CONTROL_REASONS, row.reason), "통제 사유를 선택하세요.");
    ensure(validDate(row.start), "통제 시작일을 확인하세요.");
    ensure(
      row.end === null || (validDate(row.end) && row.end >= row.start),
      "통제 종료일은 시작일 이후여야 합니다.",
    );
    ensure(row.zone === null || string(row.zone, 50), "담당구역 번호는 50자 이하로 입력하세요.");
    ensure(string(row.note, 2000), "통제 메모는 2,000자 이하로 입력하세요.");
  }
  for (const key of personalCollections) {
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
      if (key === "events") {
        if (row.recurrence !== undefined) {
          ensure(
            RECURRENCE.includes(row.recurrence),
            "반복 주기를 확인하세요.",
          );
        }
        if (row.repeatUntil !== undefined && row.repeatUntil !== null) {
          ensure(
            validDate(row.repeatUntil),
            "반복 종료일 형식을 확인하세요.",
          );
          ensure(
            row.recurrence && row.recurrence !== "none",
            "반복 종료일은 반복 주기가 설정된 일정에만 지정할 수 있습니다.",
          );
          ensure(
            row.repeatUntil >= dayKey(new Date(row.at)),
            "반복 종료일은 일정 시작일 이후여야 합니다.",
          );
        }
        // Historical metadata may outlive an edited repeat rule. Keep it intact;
        // explicit occurrence actions below require membership in the current rule.
        validateOccurrenceMetadata(row);
      }
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
        if (row.kind !== undefined && row.kind !== null)
          ensure(Object.hasOwn(PATROL_KINDS, row.kind), "순찰 종류를 확인하세요.");
        if (row.zone !== undefined && row.zone !== null)
          ensure(string(row.zone, 50), "담당구역 번호는 50자 이하로 입력하세요.");
        if (row.observations !== undefined) {
          ensure(
            Array.isArray(row.observations) &&
              row.observations.length <= MAX_OBSERVATIONS,
            `단속·확인 건은 순찰 기록마다 ${MAX_OBSERVATIONS}개 이하로 입력하세요.`,
          );
          const observationIds = new Set();
          for (const item of row.observations) {
            ensure(
              item &&
                required(item.id, 100) &&
                !observationIds.has(item.id) &&
                required(item.type, 50),
              "단속·확인 건의 유형을 입력하세요.",
            );
            observationIds.add(item.id);
            ensure(
              Number.isInteger(item.count) && item.count >= 1 && item.count <= 9999,
              "단속·확인 건수는 1~9999 사이의 정수여야 합니다.",
            );
            ensure(
              Object.hasOwn(OBSERVATION_OUTCOMES, item.outcome),
              "단속·확인 조치를 선택하세요.",
            );
            ensure(string(item.note, 500), "단속·확인 메모는 500자 이하로 입력하세요.");
            if (item.coordinates !== undefined && item.coordinates !== null)
              validateCoordinates(item.coordinates);
          }
        }
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
    version: 3,
    ...Object.fromEntries(collections.map((key) => [key, data[key]])),
    controls,
  };
}

const SOLAR_HOLIDAYS = [
  { month: 1, day: 1, name: "신정", subRule: "none" },
  { month: 3, day: 1, name: "삼일절", subRule: "weekend" },
  { month: 5, day: 5, name: "어린이날", subRule: "weekend" },
  { month: 6, day: 6, name: "현충일", subRule: "none" },
  { month: 8, day: 15, name: "광복절", subRule: "weekend" },
  { month: 10, day: 3, name: "개천절", subRule: "weekend" },
  { month: 10, day: 9, name: "한글날", subRule: "weekend" },
  { month: 12, day: 25, name: "성탄절", subRule: "weekend" },
];

// 오프라인 음력 법정공휴일 표 (2025~2035년, 설날 연휴·부처님오신날·추석 연휴)
const LUNAR_HOLIDAYS_BY_YEAR = {
  2025: [
    { date: "2025-01-28", name: "설날 연휴", subRule: "sunday", group: "설날" },
    { date: "2025-01-29", name: "설날", subRule: "sunday", group: "설날" },
    { date: "2025-01-30", name: "설날 연휴", subRule: "sunday", group: "설날" },
    { date: "2025-05-05", name: "부처님오신날", subRule: "weekend", group: "부처님오신날" },
    { date: "2025-10-05", name: "추석 연휴", subRule: "sunday", group: "추석" },
    { date: "2025-10-06", name: "추석", subRule: "sunday", group: "추석" },
    { date: "2025-10-07", name: "추석 연휴", subRule: "sunday", group: "추석" },
  ],
  2026: [
    { date: "2026-02-16", name: "설날 연휴", subRule: "sunday", group: "설날" },
    { date: "2026-02-17", name: "설날", subRule: "sunday", group: "설날" },
    { date: "2026-02-18", name: "설날 연휴", subRule: "sunday", group: "설날" },
    { date: "2026-05-24", name: "부처님오신날", subRule: "weekend", group: "부처님오신날" },
    { date: "2026-09-24", name: "추석 연휴", subRule: "sunday", group: "추석" },
    { date: "2026-09-25", name: "추석", subRule: "sunday", group: "추석" },
    { date: "2026-09-26", name: "추석 연휴", subRule: "sunday", group: "추석" },
  ],
  2027: [
    { date: "2027-02-06", name: "설날 연휴", subRule: "sunday", group: "설날" },
    { date: "2027-02-07", name: "설날", subRule: "sunday", group: "설날" },
    { date: "2027-02-08", name: "설날 연휴", subRule: "sunday", group: "설날" },
    { date: "2027-05-13", name: "부처님오신날", subRule: "weekend", group: "부처님오신날" },
    { date: "2027-09-14", name: "추석 연휴", subRule: "sunday", group: "추석" },
    { date: "2027-09-15", name: "추석", subRule: "sunday", group: "추석" },
    { date: "2027-09-16", name: "추석 연휴", subRule: "sunday", group: "추석" },
  ],
  2028: [
    { date: "2028-01-26", name: "설날 연휴", subRule: "sunday", group: "설날" },
    { date: "2028-01-27", name: "설날", subRule: "sunday", group: "설날" },
    { date: "2028-01-28", name: "설날 연휴", subRule: "sunday", group: "설날" },
    { date: "2028-05-02", name: "부처님오신날", subRule: "weekend", group: "부처님오신날" },
    { date: "2028-10-02", name: "추석 연휴", subRule: "sunday", group: "추석" },
    { date: "2028-10-03", name: "추석", subRule: "sunday", group: "추석" },
    { date: "2028-10-04", name: "추석 연휴", subRule: "sunday", group: "추석" },
  ],
  2029: [
    { date: "2029-02-12", name: "설날 연휴", subRule: "sunday", group: "설날" },
    { date: "2029-02-13", name: "설날", subRule: "sunday", group: "설날" },
    { date: "2029-02-14", name: "설날 연휴", subRule: "sunday", group: "설날" },
    { date: "2029-05-20", name: "부처님오신날", subRule: "weekend", group: "부처님오신날" },
    { date: "2029-09-21", name: "추석 연휴", subRule: "sunday", group: "추석" },
    { date: "2029-09-22", name: "추석", subRule: "sunday", group: "추석" },
    { date: "2029-09-23", name: "추석 연휴", subRule: "sunday", group: "추석" },
  ],
  2030: [
    { date: "2030-02-02", name: "설날 연휴", subRule: "sunday", group: "설날" },
    { date: "2030-02-03", name: "설날", subRule: "sunday", group: "설날" },
    { date: "2030-02-04", name: "설날 연휴", subRule: "sunday", group: "설날" },
    { date: "2030-05-09", name: "부처님오신날", subRule: "weekend", group: "부처님오신날" },
    { date: "2030-09-11", name: "추석 연휴", subRule: "sunday", group: "추석" },
    { date: "2030-09-12", name: "추석", subRule: "sunday", group: "추석" },
    { date: "2030-09-13", name: "추석 연휴", subRule: "sunday", group: "추석" },
  ],
  2031: [
    { date: "2031-01-22", name: "설날 연휴", subRule: "sunday", group: "설날" },
    { date: "2031-01-23", name: "설날", subRule: "sunday", group: "설날" },
    { date: "2031-01-24", name: "설날 연휴", subRule: "sunday", group: "설날" },
    { date: "2031-05-28", name: "부처님오신날", subRule: "weekend", group: "부처님오신날" },
    { date: "2031-09-30", name: "추석 연휴", subRule: "sunday", group: "추석" },
    { date: "2031-10-01", name: "추석", subRule: "sunday", group: "추석" },
    { date: "2031-10-02", name: "추석 연휴", subRule: "sunday", group: "추석" },
  ],
  2032: [
    { date: "2032-02-10", name: "설날 연휴", subRule: "sunday", group: "설날" },
    { date: "2032-02-11", name: "설날", subRule: "sunday", group: "설날" },
    { date: "2032-02-12", name: "설날 연휴", subRule: "sunday", group: "설날" },
    { date: "2032-05-16", name: "부처님오신날", subRule: "weekend", group: "부처님오신날" },
    { date: "2032-09-18", name: "추석 연휴", subRule: "sunday", group: "추석" },
    { date: "2032-09-19", name: "추석", subRule: "sunday", group: "추석" },
    { date: "2032-09-20", name: "추석 연휴", subRule: "sunday", group: "추석" },
  ],
  2033: [
    { date: "2033-01-30", name: "설날 연휴", subRule: "sunday", group: "설날" },
    { date: "2033-01-31", name: "설날", subRule: "sunday", group: "설날" },
    { date: "2033-02-01", name: "설날 연휴", subRule: "sunday", group: "설날" },
    { date: "2033-05-06", name: "부처님오신날", subRule: "weekend", group: "부처님오신날" },
    { date: "2033-10-06", name: "추석 연휴", subRule: "sunday", group: "추석" },
    { date: "2033-10-07", name: "추석", subRule: "sunday", group: "추석" },
    { date: "2033-10-08", name: "추석 연휴", subRule: "sunday", group: "추석" },
  ],
  2034: [
    { date: "2034-02-18", name: "설날 연휴", subRule: "sunday", group: "설날" },
    { date: "2034-02-19", name: "설날", subRule: "sunday", group: "설날" },
    { date: "2034-02-20", name: "설날 연휴", subRule: "sunday", group: "설날" },
    { date: "2034-05-25", name: "부처님오신날", subRule: "weekend", group: "부처님오신날" },
    { date: "2034-09-26", name: "추석 연휴", subRule: "sunday", group: "추석" },
    { date: "2034-09-27", name: "추석", subRule: "sunday", group: "추석" },
    { date: "2034-09-28", name: "추석 연휴", subRule: "sunday", group: "추석" },
  ],
  2035: [
    { date: "2035-02-07", name: "설날 연휴", subRule: "sunday", group: "설날" },
    { date: "2035-02-08", name: "설날", subRule: "sunday", group: "설날" },
    { date: "2035-02-09", name: "설날 연휴", subRule: "sunday", group: "설날" },
    { date: "2035-05-15", name: "부처님오신날", subRule: "weekend", group: "부처님오신날" },
    { date: "2035-09-15", name: "추석 연휴", subRule: "sunday", group: "추석" },
    { date: "2035-09-16", name: "추석", subRule: "sunday", group: "추석" },
    { date: "2035-09-17", name: "추석 연휴", subRule: "sunday", group: "추석" },
  ],
};

const holidayCache = new Map();
const parseLocalDate = (dateStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export function holidaysForYear(year) {
  ensure(
    Number.isInteger(year) && year >= 1970 && year <= 2100,
    "공휴일 조회 연도를 확인하세요.",
  );
  if (holidayCache.has(year)) return holidayCache.get(year);
  const raw = [
    ...SOLAR_HOLIDAYS.map((h) => ({
      date: `${year}-${String(h.month).padStart(2, "0")}-${String(h.day).padStart(2, "0")}`,
      name: h.name,
      subRule: h.subRule,
      group: h.name,
    })),
    ...(LUNAR_HOLIDAYS_BY_YEAR[year] || []),
  ];
  const byDate = new Map();
  for (const item of raw) {
    if (!byDate.has(item.date)) byDate.set(item.date, []);
    byDate.get(item.date).push(item);
  }
  const occupied = new Set(byDate.keys());
  const groups = new Map();
  for (const item of raw) {
    if (!groups.has(item.group)) groups.set(item.group, []);
    groups.get(item.group).push(item);
  }
  const substitutes = [];
  for (const [, items] of groups) {
    const rule = items[0].subRule;
    if (rule === "none") continue;
    let needsSub = false;
    for (const item of items) {
      const dow = parseLocalDate(item.date).getDay();
      const sameDayItems = byDate.get(item.date) || [];
      const overlapsOther = sameDayItems.some(
        (other) => other.group !== item.group,
      );
      if (rule === "weekend" && (dow === 0 || dow === 6 || overlapsOther)) {
        needsSub = true;
        break;
      }
      if (rule === "sunday" && (dow === 0 || overlapsOther)) {
        needsSub = true;
        break;
      }
    }
    if (needsSub) {
      const lastDateStr = items[items.length - 1].date;
      const cursor = parseLocalDate(lastDateStr);
      while (true) {
        cursor.setDate(cursor.getDate() + 1);
        const candidate = dayKey(cursor);
        const dow = cursor.getDay();
        if (dow !== 0 && dow !== 6 && !occupied.has(candidate)) {
          occupied.add(candidate);
          substitutes.push({
            date: candidate,
            name: "대체공휴일",
            substitute: true,
          });
          break;
        }
      }
    }
  }
  const result = new Map();
  for (const [date, items] of byDate) {
    const names = [...new Set(items.map((i) => i.name))];
    result.set(date, {
      date,
      name: names.join(" · "),
      substitute: false,
    });
  }
  for (const sub of substitutes) {
    result.set(sub.date, sub);
  }
  const sorted = [...result.values()].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  holidayCache.set(year, sorted);
  return sorted;
}

export function holidayName(date) {
  ensure(validDate(date), "공휴일 조회 날짜를 확인하세요.");
  const year = Number(date.slice(0, 4));
  const found = holidaysForYear(year).find((h) => h.date === date);
  return found ? found.name : null;
}

const daysInMonth = (year, monthIndex) =>
  new Date(year, monthIndex + 1, 0).getDate();

const occurrenceAtStep = (base, recurrence, step) => {
  if (step === 0) return new Date(base.getTime());
  const y = base.getFullYear(),
    m = base.getMonth(),
    d = base.getDate(),
    hh = base.getHours(),
    mm = base.getMinutes(),
    ss = base.getSeconds(),
    ms = base.getMilliseconds();
  if (recurrence === "daily") return new Date(y, m, d + step, hh, mm, ss, ms);
  if (recurrence === "weekly")
    return new Date(y, m, d + step * 7, hh, mm, ss, ms);
  if (recurrence === "monthly") {
    const totalMonths = m + step;
    const targetYear = y + Math.floor(totalMonths / 12);
    const targetMonth = ((totalMonths % 12) + 12) % 12;
    const clampedDay = Math.min(d, daysInMonth(targetYear, targetMonth));
    return new Date(targetYear, targetMonth, clampedDay, hh, mm, ss, ms);
  }
  if (recurrence === "yearly") {
    const targetYear = y + step;
    const clampedDay = Math.min(d, daysInMonth(targetYear, m));
    return new Date(targetYear, m, clampedDay, hh, mm, ss, ms);
  }
  return new Date(base.getTime());
};

export function expandEventOccurrences(event, range = {}) {
  const recurrence = event.recurrence ?? "none";
  const startFilter = range.startDate || null;
  const endFilter = range.endDate || null;
  ensure(RECURRENCE.includes(recurrence), "반복 주기를 확인하세요.");
  ensure(
    Number.isFinite(new Date(event.at).getTime()),
    "일정 시각을 확인하세요.",
  );
  ensure(!startFilter || validDate(startFilter), "조회 시작일을 확인하세요.");
  ensure(!endFilter || validDate(endFilter), "조회 종료일을 확인하세요.");
  validateOccurrenceMetadata(event);
  if (recurrence === "none") {
    const dKey = dayKey(new Date(event.at));
    if (startFilter && dKey < startFilter) return [];
    if (endFilter && dKey > endFilter) return [];
    return [
      {
        ...event,
        key: `event:${event.id}`,
        category: "일정",
        page: "calendar",
      },
    ];
  }
  const base = new Date(event.at);
  // Jump near the requested window; a long-running series must not disappear
  // after its first 400 occurrences. Use calendar days rather than elapsed hours
  // so daylight-saving transitions do not shift daily/weekly dates.
  const rangeStart = startFilter ? new Date(`${startFilter}T00:00:00`) : base;
  const dayNumber = (date) =>
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
  const dayDistance = dayNumber(rangeStart) - dayNumber(base);
  let firstStep = 0;
  if (recurrence === "daily") firstStep = Math.floor(dayDistance);
  if (recurrence === "weekly") firstStep = Math.floor(dayDistance / 7);
  if (recurrence === "monthly")
    firstStep =
      (rangeStart.getFullYear() - base.getFullYear()) * 12 +
      rangeStart.getMonth() -
      base.getMonth() -
      1;
  if (recurrence === "yearly")
    firstStep = rangeStart.getFullYear() - base.getFullYear() - 1;
  firstStep = Math.max(0, firstStep);
  const horizonStart = rangeStart > base ? rangeStart : base;
  const defaultHorizon = new Date(
    horizonStart.getFullYear() + 1,
    horizonStart.getMonth(),
    horizonStart.getDate(),
  );
  const defaultLimit = dayKey(defaultHorizon);
  const untilLimit = event.repeatUntil || endFilter || defaultLimit;
  const maxDate =
    event.repeatUntil && endFilter
      ? event.repeatUntil < endFilter
        ? event.repeatUntil
        : endFilter
      : untilLimit;
  const rows = [];
  const completedDates = new Set(event.completedDates ?? []);
  const excludedDates = new Set(event.excludedDates ?? []);
  for (let step = firstStep; rows.length < 400; step++) {
    const occ = occurrenceAtStep(base, recurrence, step);
    const occKey = dayKey(occ);
    if (occKey > maxDate) break;
    if ((!startFilter || occKey >= startFilter) && !excludedDates.has(occKey)) {
      rows.push({
        ...event,
        at: step === 0 ? event.at : occ.toISOString(),
        key: step === 0 ? `event:${event.id}` : `event:${event.id}:${occKey}`,
        done: event.done || completedDates.has(occKey),
        category: "일정",
        page: "calendar",
        occurrenceDate: occKey,
      });
    }
  }
  return rows;
}

function changeOccurrenceDate(event, date, key, enabled) {
  ensure(typeof enabled === "boolean", "회차 상태는 참 또는 거짓이어야 합니다.");
  ensure(validDate(date), "변경할 회차 날짜를 확인하세요.");
  ensure(event.recurrence && event.recurrence !== "none", "반복 일정의 회차만 변경할 수 있습니다.");
  validateOccurrenceMetadata(event);
  // Ignore exclusions only for membership checks so excluded days can be restored.
  const matches = expandEventOccurrences(
    { ...event, excludedDates: [] },
    { startDate: date, endDate: date },
  );
  ensure(matches.some((item) => item.occurrenceDate === date), "이 날짜는 현재 반복 일정의 회차가 아닙니다.");
  if (key === "completedDates" && !enabled)
    ensure(!event.done, "전체 완료된 반복 일정입니다. 전체 일정을 먼저 다시 시작하세요.");
  const dates = new Set(event[key] ?? []);
  if (enabled) dates.add(date);
  else dates.delete(date);
  const next = { ...event, [key]: [...dates].sort() };
  validateOccurrenceMetadata(next);
  return next;
}

/** Marks one real local-date occurrence without changing the legacy whole-series done flag. */
export function setOccurrenceDone(event, date, completed) {
  return changeOccurrenceDate(event, date, "completedDates", completed);
}

/** Excludes/restores one occurrence; its completed state remains available when restored. */
export function setOccurrenceExcluded(event, date, excluded) {
  return changeOccurrenceDate(event, date, "excludedDates", excluded);
}

/** Closures in effect on a local date (end null = until lifted). */
export function activeControls(data, date) {
  ensure(validDate(date), "통제 조회 날짜를 확인하세요.");
  return (data.controls ?? [])
    .filter((c) => c.start <= date && (c.end === null || c.end >= date))
    .sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title, "ko"));
}

// One derived calendar item per closure day inside the requested range only.
function controlDays(data, range) {
  if (!range?.startDate || !range?.endDate) return [];
  const rows = [];
  for (const c of data.controls ?? []) {
    const first = c.start > range.startDate ? c.start : range.startDate;
    const last = c.end === null || c.end > range.endDate ? range.endDate : c.end;
    for (let day = parseLocalDate(first); dayKey(day) <= last; day.setDate(day.getDate() + 1))
      rows.push({
        ...c,
        at: new Date(day.getFullYear(), day.getMonth(), day.getDate()).toISOString(),
        key: `control:${c.id}:${dayKey(day)}`,
        category: "통제",
        page: "controls",
        done: false,
      });
  }
  return rows;
}

export function calendarItems(data, range) {
  const startFilter = range?.startDate || null;
  const endFilter = range?.endDate || null;
  const inRange = (at) => {
    if (!startFilter && !endFilter) return true;
    const k = dayKey(new Date(at));
    if (startFilter && k < startFilter) return false;
    if (endFilter && k > endFilter) return false;
    return true;
  };
  return [
    ...data.events.flatMap((e) => expandEventOccurrences(e, range)),
    ...data.tasks
      .filter((t) => inRange(t.at))
      .map((t) => ({
        ...t,
        key: `task:${t.id}`,
        category: t.kind === "submission" ? "제출" : "인계",
        page: t.kind,
      })),
    ...data.patrols
      .filter((p) => inRange(p.at))
      .map((p) => ({
        ...p,
        key: `patrol:${p.id}`,
        category: "순찰",
        page: "patrol",
        done: false,
      })),
    ...controlDays(data, range),
  ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}
export function reminderItems(data, now = Date.now()) {
  const windowStart = dayKey(new Date(now - 86400000));
  const windowEnd = dayKey(new Date(now + 86400000));
  const expandedEvents = data.events.flatMap((e) =>
    !e.recurrence || e.recurrence === "none"
      ? [
          {
            id: `event:${e.id}`,
            title: e.title,
            at: e.at,
            done: e.done,
          },
        ]
      : expandEventOccurrences(e, {
          startDate: windowStart,
          endDate: windowEnd,
        }).map((occ) => ({
          id: occ.key,
          title: occ.title,
          at: occ.at,
          done: occ.done,
        })),
  );
  return [
    ...expandedEvents,
    ...data.tasks.map((t) => ({
      id: `task:${t.id}`,
      title: `${t.kind === "submission" ? "제출" : "인수인계"} · ${t.title}`,
      at: new Date(Date.parse(t.at) - t.remindMinutes * 60000).toISOString(),
      done: t.done,
    })),
  ];
}
/** Suggested observation types: defaults first, then any type already recorded. */
export function observationTypes(data) {
  const used = data.patrols.flatMap((p) => (p.observations ?? []).map((o) => o.type.trim()));
  return [...new Set([...DEFAULT_OBSERVATION_TYPES, ...used.filter(Boolean)])];
}

/** Counts patrols and observations whose patrol date (local) is within the range. */
export function patrolSummary(data, { startDate, endDate }) {
  ensure(validDate(startDate) && validDate(endDate), "집계 기간을 확인하세요.");
  const patrols = data.patrols.filter((p) => {
    const key = dayKey(new Date(p.at));
    return key >= startDate && key <= endDate;
  });
  const byKind = new Map();
  const byType = new Map();
  for (const p of patrols) {
    const kind = p.kind ?? null;
    byKind.set(kind, (byKind.get(kind) ?? 0) + 1);
    for (const o of p.observations ?? []) {
      const type = o.type.trim();
      const row = byType.get(type) ?? { type, count: 0, entries: 0, guidance: 0, fine: 0, other: 0 };
      row.count += o.count;
      row.entries += 1;
      row[o.outcome] += o.count;
      byType.set(type, row);
    }
  }
  const observations = [...byType.values()].sort((a, b) => b.count - a.count || a.type.localeCompare(b.type, "ko"));
  return {
    patrols: patrols.length,
    byKind: [...byKind].map(([kind, count]) => ({
      kind,
      label: kind ? PATROL_KINDS[kind] : "종류 미지정",
      count,
    })).sort((a, b) => b.count - a.count),
    observations,
    totalCount: observations.reduce((sum, row) => sum + row.count, 0),
  };
}

export function describeObservations(observations = []) {
  return observations
    .map((o) => `${o.type} ${o.count}건(${OBSERVATION_OUTCOMES[o.outcome]})`)
    .join(", ");
}

export function briefing(data, date) {
  ensure(/^\d{4}-\d{2}-\d{2}$/.test(date), "브리핑 날짜를 확인하세요.");
  const holiday = holidayName(date);
  const when = formatTime;
  const due = data.tasks.filter(
    (t) => !t.done && dayKey(new Date(t.at)) <= date,
  );
  const patrols = data.patrols.filter((p) => dayKey(new Date(p.at)) === date);
  const controls = activeControls(data, date);
  const events = calendarItems(data, {
    startDate: date,
    endDate: date,
  }).filter((i) => i.category === "일정");
  return [
    `공원 업무 수첩 | ${date}${holiday ? ` (${holiday})` : ""} 업무 브리핑`,
    "개인 기록 기준 · 공식 결재/근무현황 자료 아님",
    "",
    `탐방로 통제 (${controls.length})`,
    ...controls.map(
      (c) =>
        `- ${c.title}${c.zone ? ` | 담당구역 ${c.zone}` : ""} | ${CONTROL_REASONS[c.reason]} | ${c.start} ~ ${c.end ?? "해제 시까지"}${c.note ? `\n  ${c.note}` : ""}`,
    ),
    "",
    `일정 (${events.length})`,
    ...events.map(
      (e) =>
        `- [${e.done ? "완료" : "예정"}${e.recurrence && e.recurrence !== "none" ? `/${RECURRENCE_LABEL[e.recurrence]}` : ""}] ${when(e.at)} ${e.title}`,
    ),
    "",
    `순찰 기록 (${patrols.length})`,
    ...patrols.map(
      (p) =>
        `- ${p.title} | ${p.route} | ${p.observer}${p.kind ? ` | ${PATROL_KINDS[p.kind]}` : ""}${p.zone ? ` | 담당구역 ${p.zone}` : ""}\n  확인: ${p.findings || "없음"}\n  현장 조치: ${p.action || "없음"}${p.observations?.length ? `\n  단속·확인: ${describeObservations(p.observations)}` : ""}${p.coordinates ? `\n  좌표: ${formatCoordinates(p.coordinates)} | ${formatCoordinates(p.coordinates, "dms")}` : ""}`,
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
