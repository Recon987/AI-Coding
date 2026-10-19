---
id: TASK-POLISH-01
title: Codex 검토의 비차단 후속 묶음(보호본 상태 표시·달력 탭 접근성·집계 기간 검증)
status: done
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends:
priority: P2
updated: 2026-10-19
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
**완료**: 2026-10-19 사용자 승인으로 PR Recon987/AI-Coding#1(claude/zen-cannon-wc1at4)을 main에 병합(merge commit). 이전 메모: 2026-10-18 Codex가 기준 ad40b18에서 독립 검증 승인. [독립 검토 기록](../reviews/2026-10-18-codex-panel.md)과 TASK-REVIEW-PANEL-01 브랜치의 증빙 문서를 통합한다. main 병합 전이므로 review 유지. 다음 구현 후보는 TASK-EDITOR-01이다.

## 테스트 상태
Linux Node 22(2026-10-17): `npm test` 82/82 통과, `npm run test:desktop` 8개 스모크 전체 통과(새 desktop-notice-smoke 포함), `PARK_REVIEW_ZOOM=1 PARK_REVIEW_STRICT=1 node tests/ui-review.cjs` 142 검사 실패 0·외부 요청 0. Node 24·Windows Actions는 PR #1에서 확인 필요.

## 검증 기록

### Codex 독립 검증 — 2026-10-18

기준 `ad40b1863ec5373f3fb9de92c94e625b3c777f71`, Node24.19.0. npm test89/89, test:desktop 전체7진입점(콘솔8시나리오) 통과, UI142·오류0·외부요청0, 업무흐름11/11. 세 분야 독립 검토와 오류 주입/시간대/실제 앱 검사를 거쳐 완료 조건 승인. [Windows39102593618](https://github.com/Recon987/AI-Coding/actions/runs/39102593618)의 동일 소스·패키지 각 PASS도 확인. 새 차단 결함 없음. 이전 Node22·중간 실패 기록은 당시 증빙으로 보존하며 현재 판정은 이 기록을 따른다.
