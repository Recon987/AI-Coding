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
- [x] 1. 템플릿·미리보기
- [ ] 2. 내보내기 IPC·검사·기록

## 재개 위치
2단계: IPC `export-ax-report`(desktop/main.cjs·preload.cjs)는 코드 작성됨. 남은 일: tests/ax-report.test.cjs(4개 절·[작성 필요]·요청 검증·파일명), tests/desktop-axreport-smoke.cjs(미리보기=저장 파일, 복사, 저장 대화상자, IPC 거부), 전체 검사·architecture IPC 기록.

## 테스트 상태
2026-10-19 체크포인트: tsc 통과, `npm test` 153/153(보고서 검사 아직 없음), 화면 캡처 확인. test:desktop 미실행.

## 검증 기록
