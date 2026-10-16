---
id: TASK-CONFIRM-01
title: 브라우저 확인창(window.confirm)을 앱 안 확인 UI로 대체하고 편집창 닫기 비정상 종료 해소
status: review
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends: 
priority: P1
updated: 2026-10-16
---

## 배경
[UX 검토 U1·U2](../reviews/2026-10-16-ux.md). 미저장 편집창을 '닫기 ×'/Esc로 닫을 때 Electron이 SIGTRAP으로 종료(Linux 헤드리스 재현, Windows 미확인). `window.confirm` 12곳, 테스트는 confirm을 대체해 이 경로를 검사하지 못함.

## 완료 조건
- [ ] Windows 실기기 또는 Actions에서 U1 재현 여부 기록 — 원래 경로(window.confirm)는 제거되어 재현 불가. 수정 후 경로는 Windows 패키지 EXE에서 desktop-confirm-smoke로 검증(CI 단계 추가, PR에서 확인)
- [x] `window.confirm` 사용 0곳(앱 안 확인 대화상자, 기본 선택은 안전한 쪽)
- [x] 확인 UI를 실제로 클릭하는 회귀 테스트(닫기·Esc·취소·삭제), confirm 대체 없이. 모달 편집창이 열린 동안 메뉴 이동은 클릭할 수 없어 이동 확인은 기존 desktop-smoke 경로로 유지
- [x] `npm test`, `npm run test:desktop` 통과

## 범위 밖
확인 문구 전면 개편.

## 진행 단계
- [x] 1. 설계: src/confirm.tsx askConfirm()/ConfirmHost(앱 안 <dialog role=alertdialog>, 기본 포커스는 안전한 쪽, Esc=취소, 중복 요청 거부), discardChanges·confirmDelete 도우미
- [x] 2. 구현: 12곳 비동기 전환(Sheet·EditorDialog·main navigate·Office·Calendar·Patrols·Tasks·Personal·OfficeDirectory)
- [x] 3. 테스트·문서: tests/desktop-confirm-smoke.cjs(수동 클릭), desktop-smoke는 confirm 대체 대신 실제 확인창 버튼 자동 클릭, Windows CI 패키지 단계에 추가

## 재개 위치
Codex 검증: src/confirm.tsx, 12곳 비동기 전환(특히 EditorDialog.openEditor가 Promise<boolean>을 반환하도록 바뀐 것), tests/desktop-confirm-smoke.cjs, windows-build.yml 패키지 단계. Node 24 재실행과 PR Windows Actions 확인.

## 테스트 상태
2026-10-16 Linux Node 22: `npm test` 47/47, `npm run test:desktop` 통과(확인창 회귀 포함), review:ui strict 102 통과·외부 요청 0, review:flows 기존과 동일. Windows Actions 미실행.

## 검증 기록
