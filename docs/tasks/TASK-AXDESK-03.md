---
id: TASK-AXDESK-03
title: AX Desk 보고서 초안(양식 기반)과 TXT/MD 내보내기
status: in-progress
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends: TASK-AXDESK-01
priority: P3
updated: 2026-10-19
---

## 배경
TASK-ARCH-MODULAR-01 Step C-3. [보정 명세](../specs/modular-ax/implementation.md) 5장 '보고서 초안'.

## 의존 예외
- 의존 예외: TASK-AXDESK-01 (사용자 승인 2026-10-19, "이어서 AXDESK-03 진행해" — AXDESK-01은 Codex 기능 승인 후 MODULES-01 재검증 대기로 review. 검증에서 바뀌는 점은 이 카드에도 반영)

## 완료 조건
- [ ] 순수 템플릿 함수: 사업개요·추진배경·추진실적·향후계획 4개 절, 없는 정보는 `[작성 필요]`(성과·수치·법령을 지어내지 않음), "보고서 초안/추천 구조"로 안내(AI 생성 아님)
- [ ] 미리보기·복사, 명시적 IPC `export-ax-report`(사업 ID·형식만 받고 main이 저장 자료로 다시 만듦, 안전한 파일명)
- [ ] `npm test`, `npm run test:desktop` 통과, IPC 화이트리스트 기록

## 범위 밖
공식 서식 대체, 온라인 AI.

## 진행 단계
- [ ] 1. 템플릿·미리보기
- [ ] 2. 내보내기 IPC·검사·기록

## 재개 위치
1단계: shared/ax-report.mjs에 순수 템플릿 함수(4개 절, `[작성 필요]`), AX 모듈 세 번째 화면(Page "ax-report")에 사업 선택·미리보기·복사.

## 테스트 상태
미실행

## 검증 기록
