---
id: TASK-CONFIRM-01
title: 브라우저 확인창(window.confirm)을 앱 안 확인 UI로 대체하고 편집창 닫기 비정상 종료 해소
status: in-progress
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
- [ ] Windows 실기기 또는 Actions에서 U1 재현 여부 기록
- [x] `window.confirm` 사용 0곳(앱 안 확인 대화상자, 기본 선택은 안전한 쪽)
- [ ] 확인 UI를 실제로 클릭하는 회귀 테스트(닫기·Esc·이동·삭제), confirm 대체 없이
- [ ] `npm test`, `npm run test:desktop` 통과

## 범위 밖
확인 문구 전면 개편.

## 진행 단계
- [x] 1. 설계: src/confirm.tsx askConfirm()/ConfirmHost(앱 안 <dialog role=alertdialog>, 기본 포커스는 안전한 쪽, Esc=취소, 중복 요청 거부), discardChanges·confirmDelete 도우미
- [x] 2. 구현: 12곳 비동기 전환(Sheet·EditorDialog·main navigate·Office·Calendar·Patrols·Tasks·Personal·OfficeDirectory)
- [ ] 3. 테스트·문서

## 재개 위치
3단계: tests/desktop-smoke.cjs·desktop-tray-smoke.cjs·ui-review.cjs의 window.confirm 대체를 앱 확인창 자동 클릭(기본 승인, 필요 시 거절)으로 바꾸고, 닫기×·Esc·취소·이동·삭제를 수동 클릭하는 회귀 추가. Windows 재현 기록.

## 테스트 상태
2026-10-16: tsc 통과. 수동 재현 스크립트로 닫기×/Esc/취소 × 계속 작성/변경 버리기 5경로 비정상 종료 0·브라우저 확인창 0. test:desktop은 스모크가 window.confirm 대체에 의존해 아직 실패 예상(미실행).

## 검증 기록
