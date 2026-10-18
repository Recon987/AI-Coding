---
id: TASK-CALENDAR-04
title: 달력 화면 분리(C6)·툴바와 두 열 유지(U4)·날짜 격자 키보드(A7)
status: backlog
role: builder
owner: none
verifier: claude
branch: task/task-calendar-04
depends:
priority: P2
updated: 2026-10-18
---

## 배경
TASK-DATES-01에서 분리. [5개 역할 검토](../reviews/2026-10-18-panel.md)의 C6·U4·A7. 날짜 계산 통합(DATES-01) 다음에 한다.

## 완료 조건
- [ ] Calendar.tsx에서 월간 격자(MonthGrid)·주간·목록을 하위 컴포넌트로 분리(동작 불변)
- [ ] 툴바 [오늘][‹][›] 제목 … [월|주|목록], 1200px 이하에서도 두 열 유지
- [ ] 월간 날짜 격자 role="grid"와 로빙 tabindex(화살표 이동), 선택 날짜 기록으로 포커스
- [ ] `npm test`, `npm run test:desktop` 통과

## 범위 밖
반복 규칙 변경.

## 진행 단계
- [ ] 1. 착수 시 검토 문서 C6·U4·A7과 2·3차 조건을 다시 읽고 단계를 나눈다

## 재개 위치
착수 전.

## 테스트 상태
미실행

## 검증 기록
