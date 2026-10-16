---
id: TASK-CALENDAR-02
title: 반복 일정의 회차별 완료와 제외일
status: review
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
- [x] 선택 필드 `completedDates`, `excludedDates`(v3 유지, 없는 구버전 자료 정상 로드)
- [x] 달력·브리핑·알림이 회차별 상태를 반영
- [x] 저장 검증(날짜 형식, 중복, 반복 일정에서만 허용)과 회귀 테스트

## 범위 밖
반복 규칙 확장(격주·특정 요일).

## 진행 단계
- [x] 1. 모델·검증
- [x] 2. 파생 계산·알림
- [x] 3. UI
- [x] 4. 테스트·문서

## 재개 위치
Claude가 `task/task-calendar-02`의 구현·검증 기록을 독립 확인한다. 기반 수정 PR #2 위에 쌓은 PR을 먼저 검토·통합하고 PR #2 → PR #1 순으로 병합한다. main/Claude 원 브랜치에는 직접 쓰지 않았다. Windows 회차 기능은 이 소스 푸시 후 workflow_dispatch로 확인한다.

## 테스트 상태
- Node24 `npm test` **81/81**, `npm run test:desktop` 전체 통과(새 회차 스모크 포함).
- 회차 모델 전용 11개: UTC·Asia/Seoul·America/New_York 통과. 최종 희소 배열·과거 제외일 복원 보완 후 UTC·서울 재검증.
- 실제 Electron UI **142개**, 페이지 오류0·외부 요청0; 업무 흐름 **10/10**.
- 저장 실패/지연 IPC, 브리핑 TXT, 제외/복원과 완료 보존, 전체완료 해제 취소/승인, 백업/복원·재실행을 실제 앱에서 실행.
- 기반 b03d6cf의 Windows Actions38896149700 성공. 새 회차 기능의 Windows 검증과 구분한다.

## 검증 기록
모델 구현자와 별도의 자료 보존 검토자가 희소 배열 거부와 규칙 변경 후 과거 제외일 제거 계약을 확인·승인했다. UX 검토자는 저장 중 입력 잠금·모달 안 오류·미래 회차 맥락·가시적 완료 표시를 소스/화면으로 교차 승인했다. 최종 승인·병합은 카드 verifier인 Claude가 진행한다. 상세 [검토 기록](../reviews/2026-10-16-calendar02.md).

## 구현 계약

기존 done은 전체 일정 완료(과거 자료 호환), completedDates는 특정 회차 완료, excludedDates는 해당 날짜 제외로 구분한다. 반복 회차 날짜는 PC 현지 YYYY-MM-DD이며 저장 시각과 회차 키는 유지한다. 두 배열이 없는 기존 자료에는 임의 필드를 추가하지 않는다. 제외일은 UI에서 되돌릴 수 있어야 한다. 반복 해제 시 회차 메타데이터 제거는 저장 전에 안내한다.
