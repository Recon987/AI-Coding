---
id: TASK-SCHEMA-01
title: 앱 버전 혼용 보호: minReader 필드·알 수 없는 키 보존(S2) — 사용자 승인 필요
status: backlog
role: builder
owner: none
verifier: claude
branch: task/task-schema-01
depends:
priority: P1
updated: 2026-10-18
---

## 배경
[5개 역할 교차 검토 합의안](../reviews/2026-10-18-panel.md#합의안-총괄-정리-2026-10-18) 다음 주기 카드.

## 완료 조건
- [ ] 사용자 승인: 최상위 선택 필드 minReader, 모르는 값이면 읽기 전용으로 열고 저장 거부
- [ ] 알 수 없는 최상위 배열 키 보존 여부 결정과 구현
- [ ] enum 확장(D4 고발·인계, D7 근무 구분)은 이 카드 이후
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
