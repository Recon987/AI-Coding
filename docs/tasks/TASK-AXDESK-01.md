---
id: TASK-AXDESK-01
title: AX Desk 권역별 사업 관리와 마일스톤 달력·브리핑 파생
status: backlog
role: builder
owner: none
verifier: codex
branch: claude/zen-cannon-wc1at4
depends: TASK-MODULES-02
priority: P2
updated: 2026-10-19
---

## 배경
TASK-ARCH-MODULAR-01 Step C-1. [보정 명세](../specs/modular-ax/implementation.md) 5장 '사업 관리'.

## 완료 조건
- [ ] 사업 등록·수정·삭제 확인·검색·권역(전체/본사/서부/북부/연구원·보전원/기타)·단계 필터·정렬
- [ ] 집행률 막대: 총액 0은 "예산 미등록", 초과 집행은 수치와 경고(막대만 100%로 제한), 단계와 집행률을 섞지 않음, 금액 천원
- [ ] nextMilestoneDate가 있는 사업은 달력·브리핑에 원본에서 정확히 1개 파생(events/tasks에 복제하지 않음), 수정·삭제·모듈 끔 정책 검사
- [ ] `npm test`, `npm run test:desktop` 통과

## 범위 밖
스니펫(AXDESK-02), 보고서(AXDESK-03).

## 진행 단계
- [ ] 1. 사업 목록·편집
- [ ] 2. 마일스톤 파생·검사·기록

## 재개 위치
MODULES-02 완료 후.

## 테스트 상태
미실행

## 검증 기록
