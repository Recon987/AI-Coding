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
- [x] Node 24 단위·실제 앱 검사와 Windows 원본 실행 증빙 확인
- [ ] 6개 목록 의미별 버튼·행 높이·폭 경계·확대·키보드·펼침 확인
- [ ] 발견 처리, 한국어 검토·작업 기록·인계·검증 요청 푸시

## 재개 위치
목록 경계 폭 보완의 전체 검사 결과 확인 후 체크포인트 푸시·Windows 실행. 원본의 1101px 순찰 제목0px 결함을 발견해 목록 전용 전환 기준을1100→1279px로 높였다. 1280px 행67px 유지, 1101px 제목780px 확보.

## 테스트 상태
원본: Node24 npm test91/91·test:desktop10개 진입점 통과. Windows39184733043 소스10·패키지9 진입점 각 PASS·예외0 확인. 추가 회귀는 보완 전 1101px 순찰 제목0px에서 실패, 전환 기준 보완 후 목록 검사 통과. 보완본: Node24 npm test91/91·test:desktop10개 진입점 통과(7개 폭/배율 × 6개 목록의 제목·버튼 경계·의미별 모양 포함). Windows 보완본은 푸시 후 실행.

## 검증 기록
