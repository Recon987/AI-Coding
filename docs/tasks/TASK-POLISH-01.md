---
id: TASK-POLISH-01
title: Codex 검토의 비차단 후속 묶음(보호본 상태 표시·달력 탭 접근성·집계 기간 검증)
status: review
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
- [x] 달력 보기 탭 roving tabindex·aria-controls 연결, 주간 보기 통제 표시에서 원본 이동
- [x] 홈 당직 이름이 잘릴 때 전체 이름 접근(현재 title·aria만)
- [x] patrolSummary에서 시작일>종료일 명시적 거부
- [x] `npm test`, `npm run test:desktop` 통과

## 범위 밖
실기기 스크린리더·토스트·절전 확인(사용자/기관 PC).

## 진행 단계
- [x] 1. 보호본 상태 표시 — recovery.cjs `notify`, main.cjs `take-notice` IPC(1회 전달), preload `takeNotice`, main.tsx 시작·복원 후 경고, migrateFile 경고 반환. 테스트: recovery.test 2건, desktop-notice-smoke(패키지 단계 포함)
- [x] 2. 달력 탭 접근성·통제 이동 — Calendar.tsx `VIEWS`·`tabKeys`(←/→/Home/End), 탭 id·aria-controls ↔ tabpanel aria-labelledby, 주간 통제를 통제별 버튼(`openItem`)으로. 검사: desktop-list-smoke
- [x] 3. 홈 이름·집계 검증·테스트 — Briefing.tsx 사무소 근무 카드에 `office-duty-names`(전체 이름, 줄바꿈), model.mjs patrolSummary 역순 기간 거부. 검사: patrol-observations.test, desktop-list-smoke

## 재개 위치
Codex 검증: (1) desktop/recovery.cjs `notify`·desktop/main.cjs `take-notice`(전달 후 비움)·src/main.tsx 시작/복원 후 경고와 tests/desktop-notice-smoke.cjs(패키지 EXE 단계에도 추가), (2) Calendar.tsx `tabKeys`·tabpanel 연결·주간 통제 버튼, (3) Briefing.tsx `office-duty-names`, model.mjs patrolSummary 역순 거부. Windows에서 `.last-good.tmp` 디렉터리 방식으로 보호본 실패가 재현되는지(패키지 단계) 확인.

## 테스트 상태
Linux Node 22(2026-10-17): `npm test` 82/82 통과, `npm run test:desktop` 8개 스모크 전체 통과(새 desktop-notice-smoke 포함), `PARK_REVIEW_ZOOM=1 PARK_REVIEW_STRICT=1 node tests/ui-review.cjs` 142 검사 실패 0·외부 요청 0. Node 24·Windows Actions는 PR #1에서 확인 필요.

## 검증 기록
