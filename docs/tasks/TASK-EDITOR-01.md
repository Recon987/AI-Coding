---
id: TASK-EDITOR-01
title: 편집 시트 머리 한 줄(U1)·필드 필수/오류 연결(A3)·저장 중 포커스 유지(A2)
status: backlog
role: builder
owner: none
verifier: claude
branch: task/task-editor-01
depends:
priority: P1
updated: 2026-10-18
---

## 배경
[5개 역할 교차 검토 합의안](../reviews/2026-10-18-panel.md#합의안-총괄-정리-2026-10-18) 다음 주기 카드.

## 완료 조건
- [ ] 시트 머리 한 줄 [제목 … 취소|저장], 보이는 닫기 경로 유지, Ctrl+Enter 저장(aria-keyshortcuts·힌트)
- [ ] Field에 required/error/hint: 레이블 '(필수)' 글자, aria-invalid·aria-describedby, 실패 시 첫 오류 필드 포커스, 저장 버튼 비활성화 대신 오류 안내
- [ ] 저장 중 즉시 동작 컨트롤은 aria-disabled+가드로 포커스 유지
- [ ] desktop-confirm-smoke의 '닫기' 경로를 Esc·취소로 대체해 회귀 유지
- [ ] `npm test`, `npm run test:desktop` 통과

## 범위 밖
합의안의 보류·기각 항목.

## 진행 단계
- [ ] 1. 착수 시 검토 문서의 해당 발견과 2차 조건을 다시 읽고 단계를 나눈다

## 재개 위치
착수 전.

## 테스트 상태
미실행

## 검증 기록
