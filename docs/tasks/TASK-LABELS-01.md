---
id: TASK-LABELS-01
title: 라벨·허용값 단일화(C3)·누락 테스트(C8)·버튼 문구 상수화(U6)
status: review
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends:
priority: P2
updated: 2026-10-19
---

## 배경
[5개 역할 교차 검토 합의안](../reviews/2026-10-18-panel.md#합의안-총괄-정리-2026-10-18) 다음 주기 카드.

## 완료 조건
- [x] 위험 등급·근무 그룹·반복 문구를 shared 한 곳에서 정의, 허용값 스냅샷 테스트(라벨 추가가 곧 enum 확장임을 테스트로 드러냄)
- [x] describeObservations 테스트, FORM_FORMATS 미사용 정리
- [x] U6 새 기록 버튼 단어를 '등록'으로 통일(예: '메모 추가'→'메모 등록', '순찰 기록 추가'→'순찰 기록 등록')하고 상수로 관리, 스모크도 상수를 읽음
- [x] `npm test`, `npm run test:desktop` 통과

## 사용자 결정
2026-10-19 사용자가 결정을 Claude 추천에 위임("니가 추천하는 대로 그냥 진행"). 단어는 **'등록'**: 현재 화면 문구 대부분(통제·일정·업무·직원·조직·거점 등록)이 이미 '등록'이고 공공기관 업무 시스템의 관용어와 맞는다. '추가'를 쓰는 곳(메모 추가, 순찰 기록 추가 등)만 바꾼다. 목록 행의 '새 순찰'처럼 복사 입력 동작은 그대로 둔다.

## 범위 밖
합의안의 보류·기각 항목.

## 진행 단계
- [x] 1. 검토 문서 C3·C8·U6와 2차 조건 재확인: 라벨 문구 자체는 바꾸지 않음(C3), 허용값 스냅샷으로 "라벨 추가=enum 확장"을 드러냄(자료 안전), 화면낭독 이름의 대상 포함(A1) 유지, 저장 버튼은 '저장' 하나(U6)
- [x] 2. C3: shared에 RISK_LABEL·isRecurring·recurrenceText·workGroup, 중복 정의 제거
- [x] 3. C8: tests/labels.test.cjs(허용값 스냅샷·맵 키=검증 허용값), describeObservations 테스트, FormExport가 FORM_FORMATS 사용
- [x] 4. U6: shared/labels.mjs 문구 상수('<대상> 등록'·'<대상> 수정'·'저장'), 화면 교체, 스모크가 상수를 읽음
- [x] 5. 전체 검사·화면 확인·기록

## 재개 위치
구현 완료, Codex 검증 대기.

## 구현 내용·검증 요점
- C3: `shared/model.mjs`에 `RISK_LABEL`(검증 허용값도 이 맵), `isRecurring`, `recurrenceText`; `shared/office.mjs`에 `WORK_GROUPS`, `workGroup`. 중복이던 `ui.tsx riskNames`·`forms.mjs RISK`·반복 판정 13곳·근무 그룹 2곳을 이 함수로 바꿈. 화면 문구(라벨 값)는 바꾸지 않음.
- C8: `tests/labels.test.cjs` — 허용값 스냅샷(라벨 추가 = 자료 형식 확장이므로 READER_VERSION도 함께 올리도록 단언), 라벨 맵 키 = `src/types.ts` 유니언 = 검증기 허용값, 공용 함수, `describeObservations`. FormExport 형식 선택이 `FORM_FORMATS` 사용.
- U6: `shared/labels.mjs` — `TARGET`, `SAVE`('저장'), `addLabel`('<대상> 등록'), `editLabel`('<대상> 수정'), `editorTitle`. 바뀐 화면 문구: 목록 버튼 '순찰 기록/메모/전화메모/일정/인수인계/제출 기한 추가' → '… 등록', 편집창 제목 '메모 작성'·'기록 수정'·'업무 수정' → '메모 등록'·'메모 수정'/'전화메모 수정'·'인수인계 수정'/'제출 기한 수정', 저장 버튼 '순찰 저장'·'일정 저장'·'통제 저장'·'업무 등록'·'변경 저장'·'근무 저장'·'조직/직원/거점 저장' → '저장', 홈 시작 카드 '순찰 기록'·'전화메모 작성' → '순찰 기록 등록'·'전화메모 등록'. 목록 행 '수정 · 제목' 같은 화면낭독 이름(A1)은 유지.
- 테스트 11개 파일이 버튼 이름을 `shared/labels.mjs`에서 읽는다. README 문구도 갱신.

## 테스트 상태
2026-10-19 Linux(Node 22): `npm test` 106/106(새 labels 6개), `npm run test:desktop` 11개 진입점 통과, 화면 검사 150개 실패 0·외부 요청 0, 업무 과업 11/11. Windows는 푸시 후 수동 실행으로 확인.

## 검증 기록
