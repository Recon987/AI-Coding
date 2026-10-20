---
id: TASK-SECURITY-03
title: 백업 암호(scrypt)로 이동 백업 봉함·복원
status: ready
role: builder
owner: none
verifier: codex
branch: claude/zen-cannon-wc1at4
depends: TASK-SECURITY-02
priority: P1
updated: 2026-10-20
---

## 배경
[설계안](../research/security-01-design.md) 5장·10장: 백업·복원할 때마다 백업 암호 입력(PC에 저장하지 않음).

## 완료 조건
- [ ] 백업 내보내기: 암호 두 번 입력, scrypt(N=2^17, r=8, p=1) → AES-256-GCM 봉함, 암호 강도 안내
- [ ] 복원: 봉한 백업은 암호 입력(틀리면 원본 불변·재시도), 기존 평문 백업은 계속 읽기
- [ ] 변조·암호 틀림·잘린 파일에서 기존 자료 보존, 복원 보호본 규칙 유지
- [ ] `npm test`, `npm run test:desktop`, Windows Actions 통과

## 범위 밖
저장 파일 봉함(SECURITY-02).

## 진행 단계
- [ ] 1. 백업 봉투·키 유도 순수 함수와 단위 검사
- [ ] 2. 백업·복원 대화상자 연결·실제 앱 검사·기록

## 재개 위치
착수 전. 설계 승인(2026-10-20) 반영 카드.

## 테스트 상태
미실행

## 검증 기록
