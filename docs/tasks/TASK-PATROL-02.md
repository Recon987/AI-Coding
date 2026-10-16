---
id: TASK-PATROL-02
title: 순찰 종류·위반 유형 선택 필드와 기간별 집계
status: ready
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends: 
priority: P1
updated: 2026-10-16
---

## 배경
[도메인 D2](../reviews/2026-10-16-domain.md), [UX T5](../reviews/2026-10-16-ux.md). 단속·안전 실적을 셀 수 없음.

## 완료 조건
- [ ] v3 선택 필드 `patrolKind`, `observations[]`(유형·건수·계도/과태료 구분) — 없는 구버전 자료 정상 로드
- [ ] 유형 목록은 코드 상수가 아닌 설정 가능한 목록(과태료 금액은 저장하지 않음)
- [ ] 순찰 화면에서 기간·유형별 합계, T5 과업 완료
- [ ] `npm test`, `npm run test:desktop` 통과

- [ ] 순찰에 담당구역 번호(선택 문자열), 단속 기록에 위도·경도(선택, 기존 좌표 검증 재사용)
- [ ] 범용 사용: 순찰 종류·위반 유형을 쓰지 않는 직원에게 입력 부담이 늘지 않음(모두 선택 사항)

## 사용자 결정
모든 직원 범용, 담당구역 번호 + 단속은 위경도, 양식은 앱이 추천하고 사용자 피드백(2026-10-16, docs/research/knps-domain.md 7장).

## 범위 밖
위반자 인적사항(암호화 전 금지), 공식 단속 대장 대체.

## 진행 단계
- [ ] 1. 설계 메모(필드·화면)를 이 카드에 추가
- [ ] 2. 구현
- [ ] 3. 테스트·문서

## 재개 위치
착수 전.

## 테스트 상태
미실행

## 검증 기록
