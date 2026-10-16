---
id: TASK-CALENDAR-02
title: 반복 일정의 회차별 완료와 제외일
status: in-progress
role: builder
owner: codex
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
- [x] 1. 모델·검증
- [x] 2. 파생 계산·알림
- [ ] 3. UI
- [ ] 4. 테스트·문서

## 재개 위치
모델·기본 UI 구현 완료. 다음: tests/desktop-recurrence-smoke.cjs에서 회차완료/제외/복원/백업/재실행과 레거시 전체완료·수정보존을 실제 검증. 데이터 검토자가 규칙 변경 후 과거 제외일 복원 계약을 확인 중.

## 테스트 상태
모델 전용11개는 UTC·서울·뉴욕 각각 통과(기존저장검사 포함UTC28/28). UI TypeScript/Vite빌드 통과, 새회차UI실제검증은다음단계. 기반b03d6cf의Windows38896149700 성공.

## 검증 기록

## 구현 계약

기존 done은 전체 일정 완료(과거 자료 호환), completedDates는 특정 회차 완료, excludedDates는 해당 날짜 제외로 구분한다. 반복 회차 날짜는 PC 현지 YYYY-MM-DD이며 저장 시각과 회차 키는 유지한다. 두 배열이 없는 기존 자료에는 임의 필드를 추가하지 않는다. 제외일은 UI에서 되돌릴 수 있어야 한다. 반복 해제 시 회차 메타데이터 제거는 저장 전에 안내한다.
