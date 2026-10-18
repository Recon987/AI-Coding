---
id: TASK-EDITOR-01
title: 편집 시트 머리 한 줄·Ctrl+Enter 저장·시트 크기(U1)
status: in-progress
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends:
priority: P1
updated: 2026-10-18
---

## 배경
[5개 역할 교차 검토 합의안](../reviews/2026-10-18-panel.md#합의안-총괄-정리-2026-10-18) 다음 주기 카드.

## 완료 조건
- [ ] 시트 머리 한 줄 [제목 … 저장|취소]: 글자 '닫기 ×' 제거(편집 창은 취소와 Esc로 닫음), 아래 고정 둘째 줄 삭제(머리 128px → 68px)
- [ ] Ctrl+Enter로 저장(aria-keyshortcuts와 화면 힌트)
- [ ] 시트 크기 sm(480px)/md(600px): 메모·전화는 sm
- [ ] 양식 출력 시트도 같은 머리 배치(실행 버튼을 위쪽 한 줄로)
- [ ] desktop-confirm-smoke의 '닫기' 경로를 취소·Esc로 대체해 회귀 유지
- [ ] `npm test`, `npm run test:desktop`, 화면 검사 142 통과

## 범위 밖
필수/오류 표시(A3)·저장 중 포커스(A2)·aria-disabled 스타일은 TASK-EDITOR-02로 분리(카드 크기 규칙). 합의안의 보류·기각 항목.

## 진행 단계
- [x] 1. 검토 문서 U1과 2·3차 조건 재확인, 카드 분리(EDITOR-02)
- [ ] 2. Sheet·EditorDialog 머리 한 줄, Ctrl+Enter, 크기
- [ ] 3. 양식 출력 시트 배치, 스모크·화면 검사 갱신

## 재개 위치
2단계: src/components/Sheet.tsx에 size·closeButton·저장 단축키 힌트, src/style.css에서 .sheet .editor > .editor-header-actions를 시트 머리 줄 오른쪽에 고정(position: fixed, 시트가 오른쪽에 붙어 있으므로), EditorDialog는 닫기 버튼 없이.

## 테스트 상태
미실행

## 검증 기록
