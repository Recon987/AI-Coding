---
id: TASK-HOME-02
title: 홈을 '오늘' 하나로 재구성: 상태 띠(당직·통제·미완료)와 시간순 목록
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
[디자인 V6](../reviews/2026-10-16-design.md), [UX U6](../reviews/2026-10-16-ux.md).

## 완료 조건
- [x] 홈에서 오늘 당직자 확인(T1 화면 이동 0) — 상태 띠 '오늘 당직 N명 · 주간당직 이름 · 숙직 이름'. T1 1클릭·1이동 → 0·0
- [x] 날짜 변경 수단 1가지로 정리, 첫 실제 업무 행 위치 측정 유지 — 날짜 입력칸·하루 이동·'선택일 일정 보기' 제거, 주간 띠 + 이전 주/오늘/다음 주. 첫 업무 행 293px(기준 300px)
- [x] `npm test`, `npm run test:desktop` 통과

## 진행 메모
사용자 '이어서'(2026-10-16)로 LIST-01 다음에 착수. DESIGN-TOKENS-01과 같은 브랜치라 의존을 풀고 PR Recon987/AI-Coding#1에서 함께 검증. '시간순 단일 목록' 전면 재구성은 하지 않고 상태 띠·날짜 이동 정리로 한정(기존 2열 배치 유지).

## 범위 밖
통제 자료 모델(TASK-CONTROL-01).

## 진행 단계
- [x] 1. 설계: 상태 띠 타일 4개(기한 경과·오늘 마감 → 업무 목록 필터, 오늘 통제·오늘 당직 → 해당 화면), 선택일은 패널 제목에 표시
- [x] 2. 구현: src/components/Briefing.tsx(today-strip, 주 단위 이동), style.css
- [x] 3. 테스트·문서: desktop-list-smoke에 홈 검사, task-flows T1, 캡처 docs/ui-review/cycle2/home-strip-*.png

## 재개 위치
Codex 검증: Briefing.tsx 상태 띠·주 단위 이동, 960px 2×2 타일, desktop-list-smoke 홈 검사, review:ui 첫 업무 행 293px. 이전 화면 cycle1/1280x800-home.png ↔ cycle2/home-strip-1280.png.

## 테스트 상태
2026-10-16 Linux Node 22: TZ=UTC `npm test` 64/64, `npm run test:desktop` 통과, review:ui strict 134 통과, review:flows 10/10(T1 0클릭).

## 검증 기록


### Codex 검증 (2026-10-16)

기준73c938e 및 task/task-review-claude-01의 보완본 검토. 축소 범위(상태 띠·주 단위 날짜 이동)로 승인. 전체 단일 목록 전환은 미구현. Node24 npm test70/70·전체test:desktop·UI142·업무흐름10/10 통과. 상세 재현/제약: [독립 검토 기록](../reviews/2026-10-16-codex-claude.md). main 미병합이므로 status는 review 유지.
