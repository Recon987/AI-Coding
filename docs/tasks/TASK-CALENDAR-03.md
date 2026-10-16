---
id: TASK-CALENDAR-03
title: 달력 주간·목록 보기
status: review
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends:
priority: P2
updated: 2026-10-16
---

## 배경
[디자인 V7](../reviews/2026-10-16-design.md). 월간 칩 제목이 5~6자에서 잘림.

## 완료 조건
- [x] 주간(시간 축)·목록 보기 전환 — 주간: 월~일 7열, 날마다 시간순 기록·통제 표시, 이전/다음 주. 목록: 선택일부터 30일 날짜별, 행을 누르면 원본 기록으로 이동. 주간·목록에서는 오른쪽 선택일 패널을 숨겨 폭 확보. 시간 축은 시각 순서로 표현(시간대별 격자는 아님)
- [x] 월간은 유형별 건수 중심 — 부분 반영: 넘친 기록 '+N건'에 유형별 건수(예: 순찰 2 · 인계 1) 툴팁. 칩은 화면 검사·접근성 이름이 의존해 유지
- [x] `npm test`, `npm run test:desktop` 통과

## 진행 메모
사용자 '이어서'(2026-10-16)로 NAV-01 다음 착수. 같은 브랜치·PR Recon987/AI-Coding#1.

## 범위 밖
반복 규칙 변경(TASK-CALENDAR-02).

## 진행 단계
- [x] 1. 설계: 보기 탭(월간/주간/목록), 이동 단위가 보기에 따라 달·주·30일
- [x] 2. 구현: src/components/Calendar.tsx(view, weekDays, moveView, overflowByKind), style.css
- [x] 3. 테스트·문서: desktop-list-smoke에 주간·목록·이동·원본 이동 검사, 캡처 docs/ui-review/cycle2/calendar-week·list.png

## 재개 위치
Codex 검증: Calendar.tsx 보기 전환, 주 시작 월요일, 30일 목록, 월간 칩 유지 판단(카드 조건 부분 반영).

## 테스트 상태
2026-10-16 Linux Node 22: TZ=UTC `npm test` 64/64, `npm run test:desktop` 통과, review:ui strict 142 통과·외부 요청 0, review:flows 10/10.

## 검증 기록
