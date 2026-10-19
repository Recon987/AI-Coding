---
id: TASK-FORMS-02
title: 추천 양식 v2 — 단속 조치에 '고발·인계' 추가
status: backlog
role: builder
owner: none
verifier: codex
branch: task/task-forms-02
depends: TASK-FORMS-01, TASK-SCHEMA-01
priority: P2
updated: 2026-10-19
---

## 배경
FORMS-01 v1(순찰일지·단속·계도 기록 출력)과 초안(docs/research/forms-draft.md)에 대한 사용자 피드백을 받아 고친다. 시설 점검표는 자료 모델(시설·점검 항목·상태)이 없어 피드백 후 구현한다.

## 완료 조건
- [x] forms-draft.md '사용자에게 확인할 것' 4개 질문의 답과 날짜를 '피드백 기록'에 남김(2026-10-19, Claude 추천 위임)
- [ ] 단속 조치 값에 '고발·인계'(referral) 추가: types·검증·집계·양식 출력·화면 선택지, minReader 상향(TASK-SCHEMA-01 규칙)
- [ ] `npm test`, `npm run test:desktop` 통과

## 범위 밖
공식 서식 대체, 결재 연동, 위반자 인적사항. 시설 점검표(실제 서식을 받을 때까지 보류), 인쇄 전용 화면.

## 진행 단계
- [x] 1. 사용자 피드백 받기
- [ ] 2. '고발·인계' 추가(TASK-SCHEMA-01 완료 후)

## 재개 위치
TASK-SCHEMA-01 완료 대기. 답변은 docs/research/forms-draft.md '피드백 기록'.

## 테스트 상태
미실행

## 검증 기록
