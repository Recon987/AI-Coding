---
id: TASK-DESIGN-TOKENS-01
title: 디자인 토큰 정리: 글자 크기 5단계·의미 색·간격
status: backlog
role: builder
owner: none
verifier: claude
branch: task/task-design-tokens-01
depends: 
priority: P1
updated: 2026-10-16
---

## 배경
[디자인 검토 V4·V5](../reviews/2026-10-16-design.md). 글자 크기 13종(12px 70곳), 하드코딩 색 117곳, 주황이 출장·확인 필요·오늘 마감·미저장을 모두 뜻함.

## 완료 조건
- [ ] 글자 크기 토큰 5단계 외 사용 0
- [ ] 상태·유형·근무 의미 색 토큰, 하드코딩 색 0(토큰 정의부 제외)
- [ ] `npm run review:ui` 전후 캡처 비교와 대비(4.5:1) 검사
- [ ] `npm test`, `npm run test:desktop` 통과

## 범위 밖
레이아웃 변경, 글꼴 교체.

## 진행 단계
- [ ] 1. 설계 메모(필드·화면)를 이 카드에 추가
- [ ] 2. 구현
- [ ] 3. 테스트·문서

## 재개 위치
착수 전.

## 테스트 상태
미실행

## 검증 기록
