---
id: TASK-SECURITY-02
title: 저장 봉투·데이터 키(DPAPI)·복구 키
status: in-progress
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends: TASK-SECURITY-01
priority: P1
updated: 2026-10-20
---

## 배경
- 의존 예외: TASK-SECURITY-01 (사용자 승인 2026-10-20, "이어서 SECURITY-02 진행해" — 설계 카드는 Codex 검토 대기)

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
- [x] 1. 봉투·키 순수 함수와 단위 검사 (`desktop/seal.cjs`, `tests/seal.test.cjs` 7건)
- [ ] 2. store.cjs·main.cjs 연결, safeStorage
- [ ] 3. 복구 키 화면·실제 앱 검사·기록

## 재개 위치
2단계: `desktop/store.cjs`에 봉함기(`setSealer`)를 붙여 읽기·쓰기·개편 전 확인·v1/v2 전환이 봉투를 처리하게 하고, `shared/model.mjs` `READER_VERSION`을 3으로 올린다. 그다음 `desktop/main.cjs`에 키 파일 `workdesk.key.json`과 `safeStorage` 연결.

## 테스트 상태
2026-10-20 1단계: `node --test tests/seal.test.cjs` 7/7 통과. 전체 `npm test`·`test:desktop`은 미실행.

## 설계 보완(구현 중 결정)
- 봉투에 복구 키로 감싼 데이터 키 사본(`sealed.recovery`)을 함께 넣는다. 키 파일이 지워지거나 다른 PC로 옮겨도 종이 복구 키로 열 수 있게 하려는 것이다. 복구 키는 120비트 무작위라 HKDF-SHA256으로 충분하다.
- 키 파일에 `check`(데이터 키 HMAC 앞 16바이트)를 둬서 보호기가 엉뚱한 값을 돌려줘도 잘못된 키로 저장하지 않는다.

## 검증 기록
