---
id: TASK-NAV-01
title: 사이드바 재구성과 첫 사용 행동에 순찰 기록 포함
status: done
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends: 
priority: P2
updated: 2026-10-19
---

## 배경
[디자인 V3·V9](../reviews/2026-10-16-design.md). 첫 사용 행동에 순찰이 없음, 메뉴 10개 평면.

## 완료 조건
- [x] 첫 사용 행동에 순찰 기록 포함(맨 앞, 4개 행동)
- [x] 메뉴 그룹: 오늘 / 현장 / 할 일 / 일정 / 사무소 / 기록 / 설정 — 5묶음 + 하단 앱 안내로 조정(설계 메모 참조). 960×680·125%에서 메뉴 스크롤 없음
- [x] 기존 단축키·검색 유지(메뉴 버튼 이름 그대로, 테스트 통과)
- [x] `npm test`, `npm run test:desktop` 통과

## 진행 메모
사용자 '이어서'(2026-10-16)로 착수. 같은 브랜치·PR Recon987/AI-Coding#1.

## 범위 밖
화면 내용 변경.

## 진행 단계
- [x] 1. 설계: 첫 사용 행동 4개(순찰 기록·일정 등록·전화메모 작성·근무현황판 준비). 메뉴는 7묶음 대신 5묶음(오늘: 브리핑·월간 일정 / 현장: 순찰·통제 / 할 일: 인수인계·제출 / 사무소 / 기록: 전화·메모·바로가기) + 앱 안내는 하단. 항목 11개를 7묶음으로 나누면 묶음당 1~2개라 960×680에서 메뉴가 넘쳐서 조정
- [x] 2. 구현: main.tsx sections(footer), Briefing.tsx 첫 사용 4행동, style.css 메뉴 간격·시작 버튼 4열/2열
- [x] 3. 테스트·문서: desktop-smoke·ui-review 첫 사용 4개·순찰 기록 대화상자 검사(ui-review 134→142), 캡처 docs/ui-review/cycle2/nav-*.png

## 재개 위치
**완료**: 2026-10-19 사용자 승인으로 PR Recon987/AI-Coding#1(claude/zen-cannon-wc1at4)을 main에 병합(merge commit). 이전 메모: Codex 검증: 메뉴 묶음 조정 근거(7→5+하단), 첫 사용 4행동, 960×680·1280×800 125% 메뉴 넘침 없음.

## 테스트 상태
2026-10-16 Linux Node 22: TZ=UTC `npm test` 64/64, `npm run test:desktop` 통과, review:ui strict 142 통과·외부 요청 0, review:flows 10/10.

## 검증 기록


### Codex 검증 (2026-10-16)

기준73c938e 및 task/task-review-claude-01의 보완본 검토. 메뉴와 처음사용4행동·960/125% 배치 검증 승인. Node24 npm test70/70·전체test:desktop·UI142·업무흐름10/10 통과. 상세 재현/제약: [독립 검토 기록](../reviews/2026-10-16-codex-claude.md). main 미병합이므로 status는 review 유지.
