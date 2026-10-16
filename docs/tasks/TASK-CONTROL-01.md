---
id: TASK-CONTROL-01
title: 탐방로 통제 구간 기록과 브리핑 '오늘 통제'
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
[도메인 D3](../reviews/2026-10-16-domain.md), [UX T6](../reviews/2026-10-16-ux.md). 산불조심기간·기상특보 통제를 담을 곳이 없음.

## 완료 조건
- [ ] `controls` 컬렉션(구간·사유·시작·종료·근거 메모), 10,000건 한도·저장 검증
- [ ] 브리핑 화면·TXT에 오늘 유효한 통제, 달력에 기간 표시(원본에서 파생)
- [ ] T6 과업 완료
- [ ] `npm test`, `npm run test:desktop` 통과

## 범위 밖
외부 통제 정보 자동 수집.

## 진행 단계
- [x] 1. 설계·모델: controls[{id,title,zone|null,reason(fire/weather/construction/resource/other),start,end|null,note}] 현지 날짜, 기존 v3에 없으면 빈 목록(데이터 v3 유지). activeControls, calendarItems 기간 내 통제일 파생, 브리핑 TXT '탐방로 통제' 절. tests/controls.test.cjs
- [ ] 2. 구현
- [ ] 3. 테스트·문서

## 재개 위치
2단계 UI: src/components/Controls.tsx(목록: 진행 중/예정/종료, 편집창, 해제·삭제), main.tsx 메뉴·부제·검색·렌더, 홈 브리핑 '오늘 통제', 달력 통제 칩(시각 대신 '종일'). 현재 tsc는 main.tsx subtitles에 controls 누락으로 실패(의도된 중간 상태).

## 테스트 상태
2026-10-16: TZ=UTC `npm test` 60/60. tsc 실패 1건(UI 미구현). test:desktop 미실행.

## 검증 기록
