---
id: TASK-CALENDAR-02
title: 반복 일정의 회차별 완료와 제외일
status: backlog
role: builder
owner: none
verifier: claude
branch: task/task-calendar-02
depends:
priority: P1
updated: 2026-10-16
---

## 배경
반복 일정 한 회차를 완료하면 전체 회차가 완료되고 이후 알림도 꺼진다(`src/components/Calendar.tsx:272-296`, `shared/model.mjs` `expandEventOccurrences`).

## 완료 조건
- [ ] 선택 필드 `completedDates`, `excludedDates`(v3 유지, 없는 구버전 자료 정상 로드)
- [ ] 달력·브리핑·알림이 회차별 상태를 반영
- [ ] 저장 검증(날짜 형식, 중복, 반복 일정에서만 허용)과 회귀 테스트

## 범위 밖
반복 규칙 확장(격주·특정 요일).

## 진행 단계
- [ ] 1. 모델·검증
- [ ] 2. 파생 계산·알림
- [ ] 3. UI
- [ ] 4. 테스트·문서

## 재개 위치
착수 전.

## 테스트 상태
미실행

## 검증 기록
