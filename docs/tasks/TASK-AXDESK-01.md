---
id: TASK-AXDESK-01
title: AX Desk 권역별 사업 관리와 마일스톤 달력·브리핑 파생
status: in-progress
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends: TASK-MODULES-02
priority: P2
updated: 2026-10-19
---

## 배경
TASK-ARCH-MODULAR-01 Step C-1. [보정 명세](../specs/modular-ax/implementation.md) 5장 '사업 관리'.

## 의존 예외
- 의존 예외: TASK-MODULES-02 (사용자 승인 2026-10-19, "이어서 AXDESK-01 진행해" — MODULES-02는 구현·Linux 검사 완료 후 Codex 검증 대기. 검증에서 바뀌는 점은 이 카드에도 반영)

## 완료 조건
- [ ] 사업 등록·수정·삭제 확인·검색·권역(전체/본사/서부/북부/연구원·보전원/기타)·단계 필터·정렬
- [ ] 집행률 막대: 총액 0은 "예산 미등록", 초과 집행은 수치와 경고(막대만 100%로 제한), 단계와 집행률을 섞지 않음, 금액 천원
- [ ] nextMilestoneDate가 있는 사업은 달력·브리핑에 원본에서 정확히 1개 파생(events/tasks에 복제하지 않음), 수정·삭제·모듈 끔 정책 검사
- [ ] `npm test`, `npm run test:desktop` 통과

## 범위 밖
스니펫(AXDESK-02), 보고서(AXDESK-03).

## 진행 단계
- [x] 1. 사업 목록·편집
- [ ] 2. 마일스톤 파생·검사·기록

## 재개 위치
2단계: 마일스톤 파생(shared/ax.mjs milestoneItems → model.calendarItems·briefing, search.mjs ax)은 코드 작성됨. 남은 일: tests/ax-desk.test.cjs(파생 1개·수정·삭제·모듈 끔·events/tasks 미복제·브리핑 문구·검색), tests/desktop-axdesk-smoke.cjs(등록·필터·집행률 표시·달력/브리핑·재실행), 전체 검사·기록.

## 테스트 상태
2026-10-19 체크포인트: tsc 통과, `npm test` 142/142(새 AX 검사 아직 없음). test:desktop 미실행.

## 검증 기록
