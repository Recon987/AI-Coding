---
id: TASK-CONFIRM-01
title: 브라우저 확인창(window.confirm)을 앱 안 확인 UI로 대체하고 편집창 닫기 비정상 종료 해소
status: ready
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
- [ ] `window.confirm` 사용 0곳(앱 안 확인 대화상자, 기본 선택은 안전한 쪽)
- [ ] 확인 UI를 실제로 클릭하는 회귀 테스트(닫기·Esc·이동·삭제), confirm 대체 없이
- [ ] `npm test`, `npm run test:desktop` 통과

## 범위 밖
확인 문구 전면 개편.

## 진행 단계
- [ ] 1. 설계 메모(필드·화면)를 이 카드에 추가
- [ ] 2. 구현
- [ ] 3. 테스트·문서

## 재개 위치
착수 전.

## 테스트 상태
미실행

## 검증 기록
