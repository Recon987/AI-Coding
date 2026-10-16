---
id: TASK-REVIEW-UX-01
title: 핵심 과업별 조작 수·시간 측정과 사용 흐름 검토
status: in-progress
role: verifier
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends:
priority: P1
updated: 2026-10-16
---

## 배경
기능은 많지만 실제 과업(출근 확인, 현장 복귀 후 순찰 기록, 인계 작성, 제출 마감 확인, 퇴근 전 브리핑 출력)에 몇 번의 조작이 드는지 측정한 적이 없다.

## 완료 조건
- [ ] 과업 6개 이상 정의와 Electron 자동 측정(클릭·키 입력·화면 이동 수, 실패 지점)
- [ ] review-lenses B·D·E 점수와 발견 표 `docs/reviews/<날짜>-ux.md`
- [ ] 측정 스크립트를 반복 실행 가능하게 저장(가상 자료만 사용)

## 범위 밖
UI 수정(발견은 카드로 분리).

## 진행 단계
- [ ] 1. 과업 정의
- [ ] 2. 측정 스크립트
- [ ] 3. 결과와 발견 정리

## 재개 위치
1단계: 과업 정의 중. 측정은 tests/task-flows.cjs(신규) — tests/ui-review.cjs의 Electron 실행·가상 자료 방식 재사용.

## 테스트 상태
미실행

## 검증 기록
