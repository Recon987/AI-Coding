---
id: TASK-HUB-B3A-01
title: B3a 주간 실적·계획·인계 롤업 순수 함수
status: in-progress
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends: TASK-HUB-B2A-01
priority: P1
updated: 2026-10-20
---

## 배경
구현은 Claude, 검증은 Codex가 맡는다(2026-10-20 승인). 명세는 [claude-hub-schema-plan-2026-10-20.md](../product/claude-hub-schema-plan-2026-10-20.md) 4.3장이다. Codex B1(`workItems`)이 main에 들어간 뒤 착수한다(B1 카드 ID는 Codex가 정함).

## 완료 조건
- [ ] `shared/rollup.mjs`: `weeklyRollup(data, {start, end, projectId?}, now)`, `handoverRollup`. 모듈 `rollup` 합성
- [ ] 기본 기간은 월~일이고, 시간대 5종에서 결과가 같음
- [ ] 사실 항목은 모두 원본 Ref를 가짐. 일반 작업과 인계를 이중 집계하지 않음. 날짜 근거 없는 메모를 실적으로 추정하지 않음
- [ ] B3b 보고서 유형 4종의 자료를 공급: 주간 실적·계획 / 일일 브리핑(기존 `briefing` 재사용) / 사업 추진보고 / 인수인계서
- [ ] `npm test` 통과

## 범위 밖
화면·내보내기(B3b).

## 진행 단계
- [ ] 1. 기간·분류 함수와 단위 검사
- [ ] 2. 모듈 기여 합성·결정성 검사·기록

## 재개 위치
1단계 착수: main 5ab5675(B1·B2a 병합) 기준. `shared/rollup.mjs`(기간·분류·보고서 렌더)와 `tests/rollup.test.cjs`.

## 테스트 상태
미실행

## 검증 기록
