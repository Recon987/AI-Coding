---
id: TASK-HUB-B3A-01
title: B3a 주간 실적·계획·인계 롤업 순수 함수
status: done
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
- [x] `shared/rollup.mjs`: `weeklyRollup(data, {start, end, projectId?}, now)`, `handoverRollup`. 모듈 `rollup` 합성
- [x] 기본 기간은 월~일이고, 시간대 5종에서 결과가 같음
- [x] 사실 항목은 모두 원본 Ref를 가짐. 일반 작업과 인계를 이중 집계하지 않음. 날짜 근거 없는 메모를 실적으로 추정하지 않음
- [x] B3b 보고서 유형 4종의 자료를 공급: 주간 실적·계획 / 일일 브리핑(기존 `briefing` 재사용) / 사업 추진보고 / 인수인계서
- [x] `npm test` 통과

## 범위 밖
화면·내보내기(B3b).

## 진행 단계
- [x] 1. 기간·분류 함수와 단위 검사
- [x] 2. 모듈 기여 합성·결정성 검사·기록

## 재개 위치
구현 끝, Codex 검증을 기다린다(review).

**검증 지점**
- 검사: `tests/rollup.test.cjs`(10건)와 `tests/rollup-fixture.cjs`(현지 시각으로 만든 가상 자료)
- 결정성: 시간대 5종에서 보고서 문자열이 같다

**B3b(Codex)가 쓸 함수**
- `collectRollup(data, {start, end, projectId?, exclude?}, now)`
  - `exclude`에 "type:id"를 넣으면 그 항목을 뺀다(포함·제외 선택용)
  - 항목마다 `ref`가 있어 원본으로 이동할 수 있다
- `renderReport(type, data, rollup, {format, includeBodies, includePaths, axEnabled})` → `{title, filename, content}`
- 일일 브리핑은 기존 `briefing(data, date)`를 쓴다
- 유형: weekly "주간 실적·계획", project "사업 추진보고", handover "인수인계서"

**판단 기록**
- 회의와 순찰은 사업 범위 보고에서 뺀다. B1 회의에 사업 연결이 없기 때문이다.
- AX 금액은 "현재 값"으로만 쓴다.
- 날짜 없는 메모는 실적에 넣지 않는다.

## 검증 기록

### 2026-10-20 사용자 명시 승인 선병합 (Codex 사후 검증 예정)
- 근거: 사용자 "main 병합 승인할게, 병합해"(2026-10-20).
- Codex 독립 검증은 아직 받지 않았다(사후 검증 예정).
