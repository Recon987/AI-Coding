---
id: TASK-BACKUP-02
title: 복원 보호본 보관 개수 제한
status: backlog
role: builder
owner: none
verifier: claude
branch: task/task-backup-02
depends: TASK-DATA-01
priority: P2
updated: 2026-10-16
---

## 배경
복원할 때마다 `.before-restore-<시각>.json`이 생기고 지워지지 않는다(`desktop/main.cjs:91`). 평문 개인정보가 계속 쌓인다.

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
착수 전.

## 테스트 상태
미실행

## 검증 기록
