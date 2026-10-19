---
id: TASK-FORMS-02
title: 추천 양식 v2 — 단속 조치에 '고발·인계' 추가
status: in-progress
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends: TASK-FORMS-01, TASK-SCHEMA-01
priority: P2
updated: 2026-10-19
---

## 배경
FORMS-01 v1(순찰일지·단속·계도 기록 출력)과 초안(docs/research/forms-draft.md)에 대한 사용자 피드백을 받아 고친다. 시설 점검표는 자료 모델(시설·점검 항목·상태)이 없어 피드백 후 구현한다.

## 의존 예외
- 의존 예외: TASK-SCHEMA-01 (사용자 승인 2026-10-19, SCHEMA-01은 구현·Linux/Windows 검사 완료 후 Codex 검증 대기. 검증에서 바뀌는 점은 이 카드에도 반영)

## 완료 조건
- [x] forms-draft.md '사용자에게 확인할 것' 4개 질문의 답과 날짜를 '피드백 기록'에 남김(2026-10-19, Claude 추천 위임)
- [ ] 단속 조치 값에 '고발·인계'(referral) 추가: types·검증·집계·양식 출력·화면 선택지, minReader 상향(TASK-SCHEMA-01 규칙)
- [ ] `npm test`, `npm run test:desktop` 통과

## 범위 밖
공식 서식 대체, 결재 연동, 위반자 인적사항. 시설 점검표(실제 서식을 받을 때까지 보류), 인쇄 전용 화면.

## 진행 단계
- [x] 1. 사용자 피드백 받기
- [ ] 2. 모델: OBSERVATION_OUTCOMES에 referral '고발·인계', READER_VERSION 2, referral을 쓰는 자료만 minReader 2로 저장(아니면 지금처럼 필드 없음), 집계 열 추가
- [ ] 3. 화면·양식: 조치 선택지, 순찰 집계·TXT/CSV 양식의 고발·인계 열, 타입
- [ ] 4. 테스트(허용값 스냅샷 갱신·minReader 자동 기록·구버전 보호 왕복)·기록

## 재개 위치
2단계: shared/model.mjs OBSERVATION_OUTCOMES·READER_VERSION·normalize 출력의 minReader, patrolSummary 집계(guidance/fine/other → referral 추가).

## 테스트 상태
미실행

## 검증 기록
