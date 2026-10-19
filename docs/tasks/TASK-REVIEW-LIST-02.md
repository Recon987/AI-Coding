---
id: TASK-REVIEW-LIST-02
title: LIST-02 목록 행 동작·폭 경계·키보드 독립 검증
status: in-progress
role: verifier
owner: codex
verifier: claude
branch: task/task-review-list-02
depends:
priority: P2
updated: 2026-10-19
---

## 기준
Claude 구현 c0369c50f12c7438f736672b0d76fed4a4cdcad1. 다른 작업을 중복 구현하지 않고 LIST-02 완료 조건을 독립 검증한다. A11Y 알림 재진입 보완은 별도 PR #8(746b478·문서788071a)에 보존되어 있다.

## 완료 조건·진행 단계
- [x] 원격·카드·관련 코드 확인, 별도 검증 브랜치 선점
- [ ] Node 24 단위·실제 앱 검사와 Windows 원본 실행 증빙 확인
- [ ] 6개 목록 의미별 버튼·행 높이·폭 경계·확대·키보드·펼침 확인
- [ ] 발견 처리, 한국어 검토·작업 기록·인계·검증 요청 푸시

## 재개 위치
npm test·npm run test:desktop 실행, tests/desktop-list-smoke.cjs 기반 독립 폭 경계 검사. 1101~1280px에서 제목 공간·동작 넘침을 실제 측정한다.

## 테스트 상태
아직 실행하지 않음. 원본 c0369c5의 Windows39184733043은 API상 성공, 상세 소스·패키지 로그는 확인 예정.

## 검증 기록
