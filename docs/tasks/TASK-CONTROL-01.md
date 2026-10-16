---
id: TASK-CONTROL-01
title: 탐방로 통제 구간 기록과 브리핑 '오늘 통제'
status: review
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
- [x] `controls` 컬렉션(구간·사유·시작·종료·근거 메모), 10,000건 한도·저장 검증
- [x] 브리핑 화면·TXT에 오늘 유효한 통제, 달력에 기간 표시(원본에서 파생)
- [x] T6 과업 완료
- [x] `npm test`, `npm run test:desktop` 통과

## 범위 밖
외부 통제 정보 자동 수집.

## 진행 단계
- [x] 1. 설계·모델: controls[{id,title,zone|null,reason(fire/weather/construction/resource/other),start,end|null,note}] 현지 날짜, 기존 v3에 없으면 빈 목록(데이터 v3 유지). activeControls, calendarItems 기간 내 통제일 파생, 브리핑 TXT '탐방로 통제' 절. tests/controls.test.cjs
- [x] 2. 구현: src/components/Controls.tsx(진행 중/예정/종료, 등록·수정·오늘 해제·삭제), 메뉴·검색·메뉴 배지, 홈 '오늘 통제 N곳'·오늘의 기록(종일), 달력 범례·날짜별 '통제 N' 표시(칩 자리를 차지하지 않음)
- [x] 3. 테스트·문서: tests/controls.test.cjs, task-flows T6a·T6, README·architecture(이전 버전으로 되돌릴 때 통제 누락 위험 기록), 캡처 docs/ui-review/cycle2/controls·home-controls·calendar-controls.png

## 재개 위치
Codex 검증: shared/model.mjs controls 검증·activeControls·controlDays·브리핑 절, Controls.tsx, Calendar.tsx 통제 표시 분리, main.tsx 배지. 데스크톱 스모크에는 통제 시나리오가 없고 review:flows T6a·T6으로만 확인됨(필요하면 스모크 추가).

## 테스트 상태
2026-10-16 Linux Node 22: TZ=UTC `npm test` 60/60, `npm run test:desktop` 통과, review:ui strict 134 통과·외부 요청 0, review:flows 10개 과업 모두 완료.

## 검증 기록


### Codex 검증 (2026-10-16)

기준73c938e 및 task/task-review-claude-01의 보완본 검토. 예정 통제 해제 가드와 null 컬렉션 거부 보완 후 실제 Electron 회귀 승인. Node24 npm test70/70·전체test:desktop·UI142·업무흐름10/10 통과. 상세 재현/제약: [독립 검토 기록](../reviews/2026-10-16-codex-claude.md). main 미병합이므로 status는 review 유지.
