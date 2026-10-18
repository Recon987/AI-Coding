---
id: TASK-EDITOR-02
title: 필드 필수/오류 연결(A3)·저장 중 포커스 유지(A2)
status: backlog
role: builder
owner: none
verifier: claude
branch: task/task-editor-02
depends: TASK-EDITOR-01
priority: P1
updated: 2026-10-18
---

## 배경
[5개 역할 교차 검토 합의안](../reviews/2026-10-18-panel.md#합의안-총괄-정리-2026-10-18) 다음 주기 카드.

## 완료 조건
- [ ] Field에 required/error/hint: 레이블에 '(필수)' 글자(흐린 작은 글씨), aria-invalid·aria-describedby 자동 연결, 실패 시 첫 오류 필드 포커스, 저장 버튼 비활성화 대신 오류 안내
- [ ] hint 자리는 순찰 기본값 출처 안내와 공유
- [ ] 저장 중 즉시 동작 컨트롤은 aria-disabled+가드로 포커스 유지, `[aria-disabled=true]`에 `button:disabled`와 같은 시각 스타일
- [ ] `npm test`, `npm run test:desktop` 통과

## 범위 밖
머리 배치(TASK-EDITOR-01에서 완료).

## 진행 단계
- [ ] 1. 착수 시 검토 문서 A2·A3과 2·3차 조건을 다시 읽고 단계를 나눈다

## 재개 위치
착수 전. TASK-EDITOR-01에서 분리됨.

## 테스트 상태
미실행

## 검증 기록
