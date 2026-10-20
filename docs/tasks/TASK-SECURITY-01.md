---
id: TASK-SECURITY-01
title: 저장·백업 암호화 설계(Windows DPAPI/safeStorage)
status: in-progress
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends: TASK-DATA-01
priority: P1
updated: 2026-10-20
---

## 배경
업무 자료와 백업이 평문이다. 실제 민원인 정보를 넣기 전에 필요하다(`docs/project-review.md` 운영 전 남은 사항).

## 착수
- 2026-10-20 사용자 요청 "이어서 SECURITY-01 진행해"로 backlog → in-progress(사용자 승인). 클라우드 세션 지정 브랜치 사용. 담당이 claude가 되어 검증자를 codex로 바꿈. 이번 세션은 1단계(위협 모델·설계안)까지: 구현은 사용자 승인 뒤.

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
1단계: 평문 사본 목록(store.cjs·main.cjs·recovery.cjs가 쓰는 모든 파일) 조사 → docs/research/security-01-design.md(위협 모델·선택지·권장안·결정 사항) → 성능 측정 스크립트(scripts/security-bench.cjs).

## 테스트 상태
미실행

## 검증 기록
