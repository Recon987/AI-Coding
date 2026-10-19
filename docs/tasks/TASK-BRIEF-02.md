---
id: TASK-BRIEF-02
title: 월요일·연휴 다음 날 브리핑의 '전날 단속'을 직전 근무일부터 어제까지 합계로
status: in-progress
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends:
priority: P2
updated: 2026-10-19
---

## 배경
TASK-PANEL-01 D1로 브리핑에 '전날 단속·확인'(어제 하루)이 들어갔다. 월요일에는 일요일 하루만 보여 금·토 기록이 빠진다. 2026-10-19 사용자가 결정을 Claude 추천에 위임("니가 추천하는 대로 그냥 진행"): **주말 합계**로 결정. 더 정확히는 "직전 근무일부터 어제까지"로, 화요일은 월요일 하루, 월요일은 금~일, 공휴일 다음 날은 공휴일과 그 앞 근무일까지 포함한다.

## 완료 조건
- [ ] `shared/model.mjs` briefing(): 기간 = 직전 근무일(주말·`holidayName` 공휴일 제외한 가장 가까운 과거 날짜) ~ 어제. 평일 연속이면 지금과 같이 어제 하루
- [ ] 절 제목이 기간을 보여 준다(하루면 지금 문구, 여러 날이면 'MM. DD.~MM. DD.')
- [ ] 단위 테스트: 화·월·공휴일 다음 날·연휴(설·추석) 다음 날
- [ ] `npm test`, `npm run test:desktop` 통과

## 범위 밖
교대 근무자별 근무일(근무표 기반 개인 기준). 기관 공통 달력(주말·공휴일)만 쓴다.

## 진행 단계
- [ ] 1. shared/dates.mjs에 직전 근무일 계산(공휴일 함수 재사용) + 테스트
- [ ] 2. briefing() 기간·제목 적용 + 테스트, 화면·TXT 확인

## 재개 위치
1단계: shared/dates.mjs에 `previousWorkday(date, isHoliday)`(공휴일 판정은 인자로 받아 순환 import 방지), shared/model.mjs briefing()의 `yesterday` 계산(950행 근처) 교체, tests/dates.test.cjs·tests/office.test.cjs.

## 테스트 상태
미실행

## 검증 기록
