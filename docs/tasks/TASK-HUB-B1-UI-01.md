---
id: TASK-HUB-B1-UI-01
title: B1 빠른 등록 배치로 생긴 첫 화면 기준 3건 회복
status: ready
role: builder
owner: none
verifier: claude
branch: task/task-hub-b1-ui-01
depends:
priority: P2
updated: 2026-10-20
---

## 배경
[TASK-HUB-B1-01](TASK-HUB-B1-01.md) Claude 독립 검증의 발견 B1-UI-01이다. `src/components/Briefing.tsx`가 첫 사용 패널과 "챙겨야 할 업무" 위에 `QuickWork`를 둔다. 그래서 엄격 화면 검토(`PARK_REVIEW_ZOOM=1 PARK_REVIEW_STRICT=1 node tests/ui-review.cjs`) 150건 중 3건이 실패한다.
- 1280×800: "home: first real work row starts at or above 300px" — 실제 347px
- 960×680, 1280×800 125%: "first use: 전화메모 등록 is visible without scrolling" — y≈555, 높이 132

## 완료 조건
- [ ] 다음 둘 중 하나:
  - 배치를 조정해 3건을 회복한다. 예: 첫 사용에서는 시작 단추 뒤에 두고, 업무 목록에서는 머리줄과 한 줄로 만든다.
  - Gemini·사용자와 기준을 재합의해 `tests/ui-review.cjs`의 수치를 근거와 함께 고친다.
- [ ] 빠른 등록은 오늘 화면에서 계속 한 번에 보인다(통합안 B1 수용 기준).
- [ ] 엄격 화면 검토 150건·실패 0, `npm test`, `npm run test:desktop` 통과

## 범위 밖
B2b·B3b 화면.

## 진행 단계
- [ ] 1. 배치 또는 기준 결정
- [ ] 2. 수정·화면 검토·기록

## 재개 위치
착수 전.

## 테스트 상태
미실행

## 검증 기록
