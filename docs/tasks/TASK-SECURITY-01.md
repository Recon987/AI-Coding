---
id: TASK-SECURITY-01
title: 저장·백업 암호화 설계(Windows DPAPI/safeStorage)
status: backlog
role: builder
owner: none
verifier: claude
branch: task/task-security-01
depends: TASK-DATA-01
priority: P1
updated: 2026-10-16
---

## 배경
업무 자료와 백업이 평문이다. 실제 민원인 정보를 넣기 전에 필요하다(`docs/project-review.md` 운영 전 남은 사항).

## 완료 조건
- [ ] 위협 모델 문서(분실 PC, 공용 PC, 백업 USB 반출)
- [ ] 키 분실·복구 정책과 이동 백업 암호 방식 결정(사용자 승인)
- [ ] 평문→암호 전환 시 원본 백업, 대용량 성능 측정

## 범위 밖
서버 키 관리.

## 진행 단계
- [ ] 1. 위협 모델·설계안(사용자 승인 필요)
- [ ] 2. 구현
- [ ] 3. 전환·성능 검증

## 재개 위치
착수 전.

## 테스트 상태
미실행

## 검증 기록
