---
id: TASK-FORMS-01
title: 추천 양식(순찰일지·단속 기록·시설 점검표) 출력과 사용자 피드백
status: in-progress
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends:
priority: P2
updated: 2026-10-16
---

## 배경
사용자가 실제 서식 대신 앱이 양식을 추천해 만들고 피드백하기로 결정(2026-10-16, docs/research/knps-domain.md 7장). 공식 서식으로 표현하지 않는다.

## 완료 조건
- [ ] 순찰일지·단속 기록·시설 점검표 추천 양식 초안(항목·순서)을 docs/research/forms-draft.md에 작성하고 사용자 피드백 기록
- [ ] 피드백 반영한 TXT/CSV 출력(기간 선택)
- [ ] `npm test`, `npm run test:desktop` 통과

## 진행 메모
사용자 지시(2026-10-16)로 PATROL-02 검증 전에 착수. PATROL-02와 같은 브랜치(PR Recon987/AI-Coding#1) 위에 쌓으므로 의존을 머리말에서 풀고 함께 검증받는다.

## 범위 밖
공식 대장 대체, 결재 연동, 위반자 인적사항.

## 진행 단계
- [x] 1. 양식 초안 v1(docs/research/forms-draft.md): 순찰일지·단속·계도 기록은 구현, 시설 점검표는 자료 모델이 없어 초안만. 사용자 피드백은 대기
- [ ] 2. 출력 구현
- [ ] 3. 테스트·문서

## 재개 위치
3단계: IPC export-form(desktop/main.cjs, preload.cjs — 본체가 저장 자료로 buildForm, 저장 대화상자, BOM) + 순찰 화면 '양식 출력' 편집창(양식·기간·형식·미리보기) + desktop smoke. shared/forms.mjs·tests/forms.test.cjs 완료.

## 테스트 상태
2026-10-16: TZ=UTC `npm test` 64/64. UI·IPC 미구현.

## 검증 기록
