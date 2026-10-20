---
id: TASK-SECURITY-04
title: 평문→봉함 전환·평문 사본 정리·성능 실측
status: ready
role: builder
owner: none
verifier: codex
branch: claude/zen-cannon-wc1at4
depends: TASK-SECURITY-02, TASK-SECURITY-03
priority: P1
updated: 2026-10-20
---

## 배경
[설계안](../research/security-01-design.md) 5장 전환·6장 측정. 기존 사용자의 평문 파일과 사본을 처음 한 번 봉함으로 바꾼다.

## 완료 조건
- [ ] 전환 전 봉한 보호본(`.pre-encryption-backup`) 생성, 주 파일·last-good·복원/개편 전/구형식/손상 사본을 봉투로 바꾸고 평문 사본 삭제. 실패 시 평문 원본 그대로
- [ ] 전환 중 중단(전원·디스크 가득 참) 재현과 다음 실행 복구
- [ ] SSD 잔존 한계와 BitLocker 병행 권장 안내 문구
- [ ] 20MB 자료의 저장·열기·전환 시간 Windows Actions 실측 기록
- [ ] `npm test`, `npm run test:desktop`, Windows Actions 통과

## 범위 밖
서버 키 관리.

## 진행 단계
- [ ] 1. 전환 순서·원자성 설계와 단위 검사
- [ ] 2. 실제 앱·중단 재현·실측·기록

## 재개 위치
착수 전. 설계 승인(2026-10-20) 반영 카드.

## 테스트 상태
미실행

## 검증 기록
