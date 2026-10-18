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

## Codex 검증에서 넘긴 경계 (2026-10-18)

P3 비차단: `utcDayBefore`는 Date.parse를 사용하므로 offset 없는 timestamp와 명백히 역순인 반복 종료일을 가진 외부 생성 자료의 허용 결과가 호스트 시간대마다 다를 수 있다. 예: at=2026-10-18T00:30:00, repeatUntil=2026-10-16은 서울/키리티마티에서 허용되지만 UTC/파고파고에서 거부된다. 정상 자료600개(저장/읽기5TZ·날짜경계4종·시각3종·offset유무2)의 읽기는 모두 통과했다. 현재 UI가 만드는 정상 저장 자료의 차단 결함은 아니다. 날짜 유틸 통합 시 허용 범위를 명시한 회귀를 추가하고 검증 정책을 일관되게 유지한다. 이번에는 저장 정책을 임의로 바꾸지 않았다.
