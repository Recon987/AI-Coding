---
id: TASK-EDITOR-01
title: 편집 시트 머리 한 줄·Ctrl+Enter 저장·시트 크기(U1)
status: done
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends:
priority: P1
updated: 2026-10-19
---

## 배경
[5개 역할 교차 검토 합의안](../reviews/2026-10-18-panel.md#합의안-총괄-정리-2026-10-18) 다음 주기 카드.

## 완료 조건
- [x] 시트 머리 한 줄 [제목 … 저장|취소]: 글자 '닫기 ×' 제거(편집 창은 취소와 Esc로 닫음), 아래 고정 둘째 줄 삭제(머리 128px → 68px)
- [x] Ctrl+Enter로 저장(aria-keyshortcuts와 화면 힌트)
- [x] 시트 크기 sm(480px)/md(600px): 메모·전화는 sm
- [x] 양식 출력 시트도 같은 머리 배치(실행 버튼을 위쪽 한 줄로)
- [x] desktop-confirm-smoke의 '닫기' 경로를 취소·Esc로 대체해 회귀 유지
- [x] `npm test`, `npm run test:desktop`, 화면 검사 142 통과

## 범위 밖
필수/오류 표시(A3)·저장 중 포커스(A2)·aria-disabled 스타일은 TASK-EDITOR-02로 분리(카드 크기 규칙). 합의안의 보류·기각 항목.

## 진행 단계
- [x] 1. 검토 문서 U1과 2·3차 조건 재확인, 카드 분리(EDITOR-02)
- [x] 2. Sheet·EditorDialog 머리 한 줄, Ctrl+Enter, 크기 — Sheet.tsx `size`·`closeButton`·`submitShortcut`, EditorDialog는 닫기 버튼 없이 단축키 켬, style.css에서 폼의 저장·취소 줄을 머리 줄 오른쪽에 고정, 메모·전화 sm
- [x] 3. 양식 출력 시트 배치(파일로 저장·미리보기 복사·닫기를 위 한 줄로), desktop-confirm-smoke 갱신(닫기 버튼 없음, 머리 줄 위치, aria-keyshortcuts, textarea 안 Ctrl+Enter 저장)

## 재개 위치
**완료**: 2026-10-19 사용자 승인으로 PR Recon987/AI-Coding#1(claude/zen-cannon-wc1at4)을 main에 병합(merge commit). 이전 메모: Codex 검증: src/components/Sheet.tsx(`size`, `closeButton`, `submitShortcut`: Ctrl/Cmd+Enter → form.requestSubmit, 확인창이 열려 있거나 저장 중이면 무시), src/components/EditorDialog.tsx, src/components/FormExport.tsx, src/style.css의 `.sheet .editor > .editor-header-actions`(position: fixed — 시트가 화면 오른쪽에 붙어 있다는 전제), tests/desktop-confirm-smoke.cjs. 125% 배율·960px에서 제목과 버튼이 겹치지 않는지 화면 확인. 다음 카드 TASK-EDITOR-02.

## 테스트 상태
Linux Node 22(2026-10-18): `npm test` 89/89, `npm run test:desktop` 8개 통과, `PARK_REVIEW_ZOOM=1 PARK_REVIEW_STRICT=1 node tests/ui-review.cjs` 142·실패 0·외부 요청 0. 편집 창 머리 높이 128px(머리 68 + 고정 버튼 줄 60) → 68px. Node 24·Windows Actions는 PR #1에서 확인.

## 검증 기록

### Codex 독립 검증 — 2026-10-18

Node24 기준9e2d719 전체89개·실제 앱·UI142·흐름11 및 Windows39105341497 성공 확인. EDITOR-01은16개 실제 배치 조합·Ctrl/MetaEnter·필수 입력 포커스·취소 보호 승인. EDITOR-02는 접힌 오류 포커스/CSV 지연 저장 중 탭 이동의 두 결함을 TASK-REVIEW-EDITOR-01에서 보완한 결과를 승인한다. **원본 단독과 보완본 판정을 구분**하며 보완 PR을 함께 통합한다. 새 회귀3개가 수정 전 실패·수정 후 통과했고 보완본 전체 검사도 통과했다. 보완 소스f97aaf3의 [Windows39105905136](https://github.com/Recon987/AI-Coding/actions/runs/39105905136)도 소스/패키지 모두 통과했다. [PR #5](https://github.com/Recon987/AI-Coding/pull/5) 보완과 함께 통합한다. [상세 검토](../reviews/2026-10-18-codex-editor.md).
