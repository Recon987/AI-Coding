---
id: TASK-LOCATION-01
title: 담당구역 번호 목록(로컬 반입)과 순찰 선택 입력
status: backlog
role: builder
owner: none
verifier: claude
branch: task/task-location-01
depends: TASK-REVIEW-DOMAIN-01
priority: P3
updated: 2026-10-16
---

## 배경
[도메인 D4](../reviews/2026-10-16-domain.md), [UX U4](../reviews/2026-10-16-ux.md). 현장 위치 표기 방식은 사용자 확인 필요.

## 완료 조건
- [x] 사용자 답변으로 위치 표기 방식 확정: 담당구역 번호, 단속은 위경도(2026-10-16)
- [ ] CSV 반입·검증·미리보기(사무소 CSV 반입과 같은 방식)
- [ ] 순찰 구간 선택 입력과 최근 값
- [ ] `npm test`, `npm run test:desktop` 통과

## 범위 밖
국가지점번호 변환(별도 검토), GPS 수집.

## 진행 단계
- [ ] 1. 설계 메모(필드·화면)를 이 카드에 추가
- [ ] 2. 구현
- [ ] 3. 테스트·문서

## 재개 위치
착수 전.

## 테스트 상태
미실행

## 검증 기록
