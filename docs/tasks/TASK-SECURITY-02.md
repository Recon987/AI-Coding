---
id: TASK-SECURITY-02
title: 저장 봉투·데이터 키(DPAPI)·복구 키
status: ready
role: builder
owner: none
verifier: codex
branch: claude/zen-cannon-wc1at4
depends: TASK-SECURITY-01
priority: P1
updated: 2026-10-20
---

## 배경
[설계안](../research/security-01-design.md) 5장 권장안 D, 10장 사용자 결정(2026-10-20).

## 완료 조건
- [ ] store.cjs 저장 계층에서 봉투 `{version:3, minReader:3, sealed:{AES-256-GCM}}` 쓰기·읽기(자료 스키마 불변), 주 파일·last-good·모든 보호본·임시 파일에 적용
- [ ] 데이터 키: 무작위 256비트, `safeStorage`(DPAPI)로 감싼 값과 복구 키로 감싼 값을 `workdesk.key.json`에 저장. 평문 키 디스크 기록 없음. safeStorage를 쓸 수 없으면 켜지 않고 이유 표시
- [ ] 복구 키 발급(처음 한 번 표시·인쇄 안내·공용 PC/동기화 경고), DPAPI로 못 열 때 복구 키 입력 화면
- [ ] 변조·키 불일치·복구 키 틀림·디스크 가득 참에서 원본 보존과 안내, 구버전(reader 2) 앱이 봉한 파일을 바꾸지 않음 확인
- [ ] `npm test`, `npm run test:desktop`, Windows Actions(DPAPI 실제 사용) 통과

## 범위 밖
백업 암호(SECURITY-03), 기존 평문 전환(SECURITY-04).

## 진행 단계
- [ ] 1. 봉투·키 순수 함수와 단위 검사
- [ ] 2. store.cjs·main.cjs 연결, safeStorage
- [ ] 3. 복구 키 화면·실제 앱 검사·기록

## 재개 위치
착수 전. 설계 승인(2026-10-20) 반영 카드.

## 테스트 상태
미실행

## 검증 기록
