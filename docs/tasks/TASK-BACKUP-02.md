---
id: TASK-BACKUP-02
title: 복원 보호본 보관 개수 제한
status: in-progress
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends: TASK-DATA-01
priority: P2
updated: 2026-10-19
---

## 배경
복원할 때마다 `.before-restore-<시각>.json`이 생기고 지워지지 않는다(`desktop/main.cjs:91`). 평문 개인정보가 계속 쌓인다.

## 착수
2026-10-19 사용자 요청("이어서 BACKUP-02 진행해")으로 backlog에서 바로 착수. 보관 개수 기본 5는 카드 원안(사용자가 결정을 Claude 추천에 위임, 2026-10-19).

## 완료 조건
- [ ] 최근 N개(기본 5)만 유지, 오래된 것부터 정리하되 정리 전 사용자 안내
- [ ] v1/v2 전환 백업·손상본은 정리 대상 아님
- [ ] 회귀 테스트

## 범위 밖
암호화.

## 진행 단계
- [ ] 1. 정책·구현
- [ ] 2. 테스트·문서

## 재개 위치
1단계: desktop/store.cjs에 복원 보호본 목록·정리 함수, desktop/main.cjs restore 처리(확인창에 정리될 개수 안내 → 복원 성공 뒤 정리, 실패해도 복원은 유지).

## 테스트 상태
미실행

## 검증 기록
