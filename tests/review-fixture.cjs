// Entirely fictional records. Never read or merge a person's existing profile.
const { empty, normalize } = require("../shared/model.mjs");

const REVIEW_DATE = "2026-10-15";
function reviewFixture(date = REVIEW_DATE) {
  const at = (offset, hour) => {
    const value = new Date(`${date}T12:00:00Z`);
    value.setUTCDate(value.getUTCDate() + offset);
    value.setUTCHours(hour - 9, 0, 0, 0);
    return value.toISOString();
  };
  const dateAt = (offset) => {
    const value = new Date(`${date}T12:00:00Z`);
    value.setUTCDate(value.getUTCDate() + offset);
    return value.toISOString().slice(0, 10);
  };
  const data = empty();
  data.organizations = [
    { id: "review-org-1", code: "VIRTUAL-PARK", name: "가상공원 시험사무소", parentId: null },
    { id: "review-org-2", code: "VIRTUAL-FIELD", name: "가상공원 현장지원분소", parentId: "review-org-1" },
  ];
  data.bases = [
    { id: "review-base-1", code: "VIRTUAL-B01", name: "가상 북쪽탐방지원센터", organizationId: "review-org-1" },
    { id: "review-base-2", code: "VIRTUAL-B02", name: "가상 계곡생태탐방안내거점", organizationId: "review-org-2" },
  ];
  data.employees = Array.from({ length: 14 }, (_, index) => ({
    id: `review-staff-${index + 1}`,
    code: `VIRTUAL-${String(index + 1).padStart(3, "0")}`,
    name: index === 4 ? "가상직원05 긴이름표시검토" : `가상직원${String(index + 1).padStart(2, "0")}`,
    organizationId: index < 7 ? "review-org-1" : "review-org-2",
    position: index % 5 === 0 ? "탐방안전·시설물 관리 담당" : index === 1 ? "팀장" : "담당",
    active: true,
  }));
  data.assignments = [];
  for (let offset = -3; offset <= 3; offset++) {
    for (let index = 0; index < 14; index++) {
      // Two unregistered people on the reference day, not inferred as at work.
      if (offset === 0 && index >= 12) continue;
      const workType = ["work", "base", "off", "leave", "trip"][((index + offset) % 5 + 5) % 5];
      data.assignments.push({
        id: `review-shift-${offset + 3}-${index}`,
        employeeId: data.employees[index].id,
        date: dateAt(offset),
        workType,
        duty: index === 0 ? "day" : index === 1 ? "night" : "none",
        baseId: workType === "base" ? (index < 7 ? "review-base-1" : "review-base-2") : null,
        note: index === 1 ? "가상 교대 인계: 안전시설 상태와 긴급 연락 사항을 다음 근무자에게 전달" : index % 4 === 0 ? "오후 현장 점검 후 복귀 예정" : "",
      });
    }
  }
  data.patrols = Array.from({ length: 6 }, (_, index) => ({
    id: `review-patrol-${index + 1}`,
    title: ["가상 북쪽탐방로 안전난간 보수 구간 확인", "가상 계곡 탐방객 통행 상태 및 우천 시 통제 안내 점검", "가상 탐방지원센터 주변 시설 확인"][index % 3],
    at: at(index < 3 ? 0 : -1, 8 + index),
    route: index % 2 ? "가상 계곡안내소 → 생태관찰구간 → 남쪽 쉼터" : "가상 북쪽탐방지원센터 → 전망대 → 능선 안전시설 점검구간",
    observer: data.employees[index].name,
    findings: "가상 점검 자료입니다. 난간 연결부와 안내판 상태를 확인했습니다. 다음 순찰 시 같은 위치를 다시 살피고, 변경된 현장 상태를 상세히 기록합니다. ".repeat(index === 1 ? 6 : 1),
    action: "가상 조치: 임시 안내 후 시설 담당자에게 후속 확인 요청",
    risk: index === 0 ? "urgent" : index % 2 ? "attention" : "normal",
    ...(index % 2 === 0 ? { coordinates: { latitude: 37.658 + index / 10000, longitude: 126.977 } } : {}),
  }));
  const taskTitles = [
    "가상 북쪽탐방로 안전난간 보수 완료 여부 확인",
    "가상 주간 순찰 실적 취합 및 자원보전부 제출",
    "가상 급량비 증빙과 참석자 명단 정리",
    "가상 계곡 탐방로 통제 안내판 설치·유지관리 결과 보고와 다음 주 조치 계획 확인",
    "가상 장비 대여·반납 확인",
    "가상 탐방안전 협의회 후속 사항 인계",
    "가상 다음 주 현장지원 인력 배치 확인",
    "가상 행정자료 제출 기한 확인",
  ];
  data.tasks = taskTitles.map((title, index) => ({
    id: `review-task-${index + 1}`,
    kind: index % 2 ? "submission" : "handover",
    title,
    body: "가상 검토 자료입니다. 담당자와 처리 현황을 확인하고, 확인 결과와 추가 조치가 필요한 사항을 남겨주세요. ".repeat(index === 3 ? 8 : 1),
    at: at(index < 2 ? -1 : index < 5 ? 0 : 2, 15 + index % 3),
    assignee: data.employees[index].name,
    destination: index % 2 ? "가상공원 시험사무소 자원보전 담당" : "",
    priority: index < 2 ? "high" : "normal",
    remindMinutes: 60,
    patrolId: index === 0 ? "review-patrol-1" : null,
    done: false,
    completedAt: null,
  }));
  data.events = [
    { id: "review-event-1", title: "가상 현장 안전점검 회의", at: at(0, 10), done: false },
    { id: "review-event-2", title: "가상 탐방지원센터 운영 협의 및 주간 현장 지원 일정 조정", at: at(0, 14), done: false },
    { id: "review-event-3", title: "가상 탐방해설 프로그램 준비", at: at(1, 9), done: false },
  ];
  data.calls = Array.from({ length: 3 }, (_, index) => ({
    id: `review-call-${index + 1}`,
    title: ["가상 탐방로 개방 여부 회신", "가상 시설 점검 담당자 연락 요청", "가상 행사 일정 문의"][index],
    phone: "000-0000-0000",
    body: "가상 전화메모입니다. 관련 담당자 확인 후 회신 요청. 실제 전화번호나 개인정보가 아닙니다.",
    done: index === 2,
  }));
  data.notes = Array.from({ length: 5 }, (_, index) => ({
    id: `review-note-${index + 1}`,
    title: index === 1 ? "가상 주간업무: 우천 시 현장 동선과 통제 구간별 안내 방법을 다시 확인할 항목" : `가상 업무 수첩 ${index + 1} — 다음 근무 시 확인할 사항`,
    body: "가상 업무 메모입니다. 우천 시 통제 구간, 대체 순찰 동선, 연락망 확인 절차를 정리했습니다.\n\n현장 상태는 실제 점검 결과에 따라 갱신합니다. ".repeat(index === 1 ? 12 : 2),
  }));
  return normalize(data);
}

module.exports = { REVIEW_DATE, reviewFixture };
