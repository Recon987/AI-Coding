---
id: TASK-POLISH-01
title: Codex 검토의 비차단 후속 묶음(보호본 상태 표시·달력 탭 접근성·집계 기간 검증)
status: in-progress
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends:
priority: P2
updated: 2026-10-17
---

## 배경
[Codex 독립 검증](../reviews/2026-10-16-codex-claude.md) '비차단 후속'을 놓치지 않게 모은 카드.

## 완료 조건
- [x] 시작 시 보호본 준비 실패·복원 직후 보호본 실패를 화면에 보이게 표시(현재 로그만)
- [ ] 달력 보기 탭 roving tabindex·aria-controls 연결, 주간 보기 통제 표시에서 원본 이동
- [ ] 홈 당직 이름이 잘릴 때 전체 이름 접근(현재 title·aria만)
- [ ] patrolSummary에서 시작일>종료일 명시적 거부
- [ ] `npm test`, `npm run test:desktop` 통과

## 범위 밖
실기기 스크린리더·토스트·절전 확인(사용자/기관 PC).

## 진행 단계
- [x] 1. 보호본 상태 표시 — recovery.cjs `notify`, main.cjs `take-notice` IPC(1회 전달), preload `takeNotice`, main.tsx 시작·복원 후 경고, migrateFile 경고 반환. 테스트: recovery.test 2건, desktop-notice-smoke(패키지 단계 포함)
- [ ] 2. 달력 탭 접근성·통제 이동
- [ ] 3. 홈 이름·집계 검증·테스트

## 재개 위치
2단계: src/components/Calendar.tsx 보기 탭(월간·주간·목록)에 roving tabindex(←/→/Home/End)·id·aria-controls와 tabpanel 연결, 주간 보기 통제 표시를 버튼으로 바꿔 통제 원본(navigate('controls', id))으로 이동. 검사는 tests/desktop-list-smoke.cjs 달력 부분에 추가.

## 테스트 상태
1단계 후: `npm test` 통과, `node tests/desktop-notice-smoke.cjs` 통과. 전체 `npm run test:desktop`은 마지막 단계에서 실행.

## 검증 기록
