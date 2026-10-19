---
id: TASK-DESIGN-TOKENS-01
title: 디자인 토큰 정리: 글자 크기 5단계·의미 색·간격
status: done
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends: 
priority: P1
updated: 2026-10-19
---

## 배경
[디자인 검토 V4·V5](../reviews/2026-10-16-design.md). 글자 크기 13종(12px 70곳), 하드코딩 색 117곳, 주황이 출장·확인 필요·오늘 마감·미저장을 모두 뜻함.

## 완료 조건
- [x] 글자 크기 토큰 5단계 외 사용 0 (13종 → 12·14·16·20·28, tests/style-tokens.test.cjs가 강제)
- [x] 상태·유형·근무 의미 색 토큰, 하드코딩 색 0(토큰 정의부 제외): 108개 색을 Lab 거리로 가장 가까운 톤 32개에 매핑. 출장·인계/제출 칩·당직은 경고 주황에서 분리
- [x] `npm run review:ui` 전후 캡처 비교와 대비(4.5:1) 검사: 글자/배경 쌍 13개 모두 4.5:1 이상, strict 134 통과, 전후 docs/ui-review/cycle1 ↔ cycle2
- [x] `npm test`, `npm run test:desktop` 통과

## 범위 밖
레이아웃 변경, 글꼴 교체.

## 진행 단계
- [x] 1. 설계: 톤 팔레트(:root 유일) + 의미 별칭(--status-*, --cat-*, --work-*), Tag tone을 danger/warning/patrol/task/holiday/duty로 타입 고정
- [x] 2. 구현: src/style.css, ui.tsx Tag, Calendar·Tasks·Patrols·Briefing·Office tone 변경, 주간표 당직·거점 줄 클래스
- [x] 3. 테스트·문서: tests/style-tokens.test.cjs

## 재개 위치
**완료**: 2026-10-19 사용자 승인으로 PR Recon987/AI-Coding#1(claude/zen-cannon-wc1at4)을 main에 병합(merge commit). 이전 메모: Codex 검증: docs/ui-review/cycle1과 cycle2 캡처 비교(색만 바뀌고 배치 동일해야 함, 13px→14px로 메타 글자 소폭 확대), style-tokens 테스트, 대비 수치. 간격 4·8 배수 정리는 이 카드에서 하지 않음(TASK-LIST-01에서 컴포넌트와 함께).

## 테스트 상태
2026-10-16 Linux Node 22: `npm test` 50/50, `npm run test:desktop` 통과, review:ui strict(125% 포함) 134 통과·오류 0·외부 요청 0.

## 검증 기록


### Codex 검증 (2026-10-16)

기준73c938e 및 task/task-review-claude-01의 보완본 검토. 규칙·크기5단계 및 독립 대비 점검 승인. Node24 npm test70/70·전체test:desktop·UI142·업무흐름10/10 통과. 상세 재현/제약: [독립 검토 기록](../reviews/2026-10-16-codex-claude.md). main 미병합이므로 status는 review 유지.
