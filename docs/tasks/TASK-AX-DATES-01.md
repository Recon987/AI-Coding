---
id: TASK-AX-DATES-01
title: AX 마일스톤의 100년 미만 연도 보존
status: review
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends:
priority: P3
updated: 2026-10-19
---

## 배경
TASK-REVIEW-MODULAR-01의 AX-DATE-01. shared/ax.mjs milestoneItems는 검증이 허용하는 0099-10-21을 new Date(y,m-1,d)의 1900 보정 때문에 1999년으로 바꾼다. 실제 업무의 2026년 정상 흐름은 통과했으며 낮은 연도 경계는 후속 보완으로 분리한다.

## 착수
- 2026-10-19 사용자 요청 "이어서 AX-DATES-01 진행해"로 backlog → in-progress(사용자 승인). 클라우드 세션 지정 브랜치 사용.

## 완료 조건
- [x] 허용된 원본 날짜의 연도를 임의로 바꾸지 않는다(0001·0099·0100·2026년, 윤년, 5개 시간대).
- [x] 기존 허용 자료를 임의 삭제·날짜 변경·손실성 거부로 처리하지 않는다. 달력/브리핑에 사용하는 날짜 키 패딩도 함께 대조한다.
- [x] tests/modular-contract-audit.cjs의 AX-DATE-01 및 npm test·npm run test:desktop 통과. MOD-01은 다른 카드이므로 감사 두 사례의 결과를 구분한다.

## 범위 밖
이번 주 마일스톤/알림 정책, 스니펫, 보고서.

## 진행 단계
- [x] 1. 허용 날짜를 보존하는 생성 방식과 공유 날짜 키 계약 보완
- [x] 2. 시간대별 회귀·실제 앱 확인·증빙

## 재개 위치
구현 완료, Codex 검증 대기. 검증 때 볼 곳: shared/dates.mjs `localDate`, shared/model.mjs(dayKey 4자리·parseLocalDate·controlDays·반복 일정·builtInHolidays 표 범위·사용자 공휴일 연도 접두), shared/ax.mjs milestoneItems, src/components/Calendar.tsx(월 격자·표 범위 안내), tests/low-years.test.cjs, tests/desktop-low-years-smoke.cjs, tests/store.test.cjs 457행(계약 변경).

## 구현 메모
- 원인: `new Date(y, m, d)`는 y가 0~99면 1900+y로 읽는다. 날짜 키를 부분으로 쪼개 다시 만드는 곳이 모두 같은 위험이었다.
- 보완: `shared/dates.mjs`에 `localDate(year, monthIndex, day, …)`(내부에서 setFullYear로 연도 보존, 넘친 달·날은 생성자처럼 굴림). 적용 위치: AX 마일스톤 파생, `parseLocalDate`(공휴일·통제 계산), 탐방로 통제 일별 항목(controlDays), 반복 일정 일·주·월·연 회차, 달력 월 격자. `dayKey`는 연도를 4자리로 채운다("99-10-21" → "0099-10-21").
- **계약 변경 1건(검증 바람)**: 기본 공휴일 표 밖(1970년 전·2100년 후)의 해는 이전에 "공휴일 조회 연도를 확인하세요" 예외로 브리핑·달력이 멈췄다. 이제 기본 공휴일 없이(사용자 등록 공휴일만) 표시하고 달력에 "공휴일 표(1970~2100년) 밖" 안내를 보인다. 정수가 아닌 연도는 여전히 거부. 이에 맞춰 tests/store.test.cjs의 `holidaysForYear(1800)` 예외 기대를 빈 목록 기대로 바꿨다. 사용자 공휴일의 연도 비교도 4자리로 맞췄다.
- 날짜 검증 범위는 좁히지 않았고 기존 자료를 지우거나 바꾸지 않는다(열람만으로 무저장 확인).
- 화면의 달력 제목은 "99년 10월"처럼 숫자 그대로 보인다(1999가 아님).
- 참고(이 카드 밖, 기존 문제): TZ=America/New_York·Pacific/Honolulu에서 tests/schema.test.cjs의 '고발·인계' 검사(139번) 하나가 바꾸기 전 코드에서도 실패한다. 한국 시각 고정 자료를 현지 날짜로 집계하는 검사 쪽 시간대 의존이다.

## 테스트 상태
2026-10-19 Linux(Node 22): `npm test` 161/161(새 low-years 3개 + 공휴일 계약 변경 반영). 시간대 5종(서울·UTC·뉴욕·키리티마티·호놀룰루): 서울·UTC·키리티마티 161/161, 뉴욕·호놀룰루 160/161(위 기존 139번만, 바꾸기 전에도 실패). `tests/modular-contract-audit.cjs` 5개 시간대 모두 종료 0(MOD-01·AX-DATE-01 통과). `npm run test:desktop` 종료 0(진입점 17개 + 감사 3개, 새 desktop-low-years-smoke), 화면 검사(확대 포함 strict) 150·실패 0·외부 요청 0, 업무 과업 11/11. Windows는 푸시 후 수동 실행.

## 검증 기록
구현 전. 우선순위 P3 후속이며 TASK-AXDESK-01의 정상 업무 기능 승인과 분리한다.
