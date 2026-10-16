---
id: TASK-FORMS-01
title: 추천 양식(순찰일지·단속 기록·시설 점검표) 출력과 사용자 피드백
status: backlog
role: builder
owner: none
verifier: claude
branch: task/task-forms-01
depends: TASK-PATROL-02
priority: P2
updated: 2026-10-16
---

## 배경
사용자가 실제 서식 대신 앱이 양식을 추천해 만들고 피드백하기로 결정(2026-10-16, docs/research/knps-domain.md 7장). 공식 서식으로 표현하지 않는다.

## 완료 조건
- [ ] 순찰일지·단속 기록·시설 점검표 추천 양식 초안(항목·순서)을 docs/research/forms-draft.md에 작성하고 사용자 피드백 기록
- [ ] 피드백 반영한 TXT/CSV 출력(기간 선택)
- [ ] `npm test`, `npm run test:desktop` 통과

## 범위 밖
공식 대장 대체, 결재 연동, 위반자 인적사항.

## 진행 단계
- [ ] 1. 양식 초안과 사용자 피드백
- [ ] 2. 출력 구현
- [ ] 3. 테스트·문서

## 재개 위치
TASK-PATROL-02 이후 착수.

## 테스트 상태
미실행

## 검증 기록
