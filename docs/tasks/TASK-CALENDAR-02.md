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
- [ ] 1. 모델·검증
- [ ] 2. 파생 계산·알림
- [ ] 3. UI
- [ ] 4. 테스트·문서

## 재개 위치
사용자의 같은 저장소 작업 확인 후 이어가기 지시에 따라 다음 P1으로 착수. 검증 보완 b03d6cf를 기반으로 독립 브랜치에서 모델·순수 회귀 → UI·실제 Electron → 문서·검증 단계로 진행한다. Claude 원본 브랜치와 main은 미수정.

## 테스트 상태
선점 체크포인트: 미실행. 기반 b03d6cf는70개/전체Electron/UI142/흐름10 통과.

## 검증 기록

## 구현 계약

기존 done은 전체 일정 완료(과거 자료 호환), completedDates는 특정 회차 완료, excludedDates는 해당 날짜 제외로 구분한다. 반복 회차 날짜는 PC 현지 YYYY-MM-DD이며 저장 시각과 회차 키는 유지한다. 두 배열이 없는 기존 자료에는 임의 필드를 추가하지 않는다. 제외일은 UI에서 되돌릴 수 있어야 한다. 반복 해제 시 회차 메타데이터 제거는 저장 전에 안내한다.
