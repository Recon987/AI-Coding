---
id: TASK-FORMS-02
title: 추천 양식 v2 — 사용자 피드백 반영과 시설 점검표
status: blocked
role: builder
owner: user
verifier: codex
branch: task/task-forms-02
depends: TASK-FORMS-01
priority: P2
updated: 2026-10-16
---

## 배경
FORMS-01 v1(순찰일지·단속·계도 기록 출력)과 초안(docs/research/forms-draft.md)에 대한 사용자 피드백을 받아 고친다. 시설 점검표는 자료 모델(시설·점검 항목·상태)이 없어 피드백 후 구현한다.

## 완료 조건
- [ ] forms-draft.md '사용자에게 확인할 것' 4개 질문의 답과 날짜를 '피드백 기록'에 남김
- [ ] 답에 따라 순찰일지·단속·계도 기록 항목 수정
- [ ] 시설 점검표: 승인되면 시설·점검 항목 모델(v3 선택 컬렉션)과 출력, 다음 점검일 달력 파생
- [ ] `npm test`, `npm run test:desktop` 통과

## 범위 밖
공식 서식 대체, 결재 연동, 위반자 인적사항.

## 진행 단계
- [ ] 1. 사용자 피드백 받기(차단 사유)
- [ ] 2. 양식 수정
- [ ] 3. 시설 점검표

## 재개 위치
사용자 답변 대기: docs/research/forms-draft.md '사용자에게 확인할 것'.

## 테스트 상태
미실행

## 검증 기록
