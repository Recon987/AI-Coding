---
id: TASK-DATES-01
title: 날짜·주간·기간 계산을 shared/dates.mjs로 단일화(C2) 후 달력 개편 준비
status: backlog
role: builder
owner: none
verifier: claude
branch: task/task-dates-01
depends:
priority: P2
updated: 2026-10-18
---

## 배경
[5개 역할 교차 검토 합의안](../reviews/2026-10-18-panel.md#합의안-총괄-정리-2026-10-18) 다음 주기 카드.

## 완료 조건
- [ ] 월요일 시작 주·하루 이동·기간 계산을 Briefing·Office·Calendar·FormExport·Observations에서 shared로 이동(동작 불변)
- [ ] TZ 3종 단위 테스트
- [ ] 후속: C6 Calendar 분리 → U4 툴바·두 열 유지 → A7 날짜 격자 grid/로빙
- [ ] `npm test`, `npm run test:desktop` 통과

## 범위 밖
합의안의 보류·기각 항목.

## 진행 단계
- [ ] 1. 착수 시 검토 문서의 해당 발견과 2차 조건을 다시 읽고 단계를 나눈다

## 재개 위치
착수 전.

## 테스트 상태
미실행

## 검증 기록
