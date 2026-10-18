---
id: TASK-DATES-01
title: 날짜·주간·기간 계산을 shared/dates.mjs로 단일화(C2) 후 달력 개편 준비
status: review
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends:
priority: P2
updated: 2026-10-18
---

## 배경
[5개 역할 교차 검토 합의안](../reviews/2026-10-18-panel.md#합의안-총괄-정리-2026-10-18) 다음 주기 카드.

## 완료 조건
- [x] 월요일 시작 주·하루 이동·기간 계산을 Briefing·Office·Calendar·FormExport·Observations에서 shared로 이동(동작 불변)
- [x] TZ 3종 단위 테스트
- [x] 시간대 표시 없는 외부 자료의 반복 종료일 읽기 판정이 PC 시간대와 무관(Codex P3)
- [x] `npm test`, `npm run test:desktop` 통과

## 범위 밖
달력 화면 분리(C6)·툴바/두 열(U4)·날짜 격자 키보드(A7)는 TASK-CALENDAR-04로 분리. 합의안의 보류·기각 항목.

## 진행 단계
- [x] 1. 검토 문서 C2와 2차 조건(안전: 동작 불변 이동·TZ 여러 종 테스트) 재확인, 카드 분리(CALENDAR-04)
- [x] 2. shared/dates.mjs(validDateKey·addDays·weekStart·weekDays·daysInclusive·periodRange·earliestLocalDay)와 tests/dates.test.cjs(시간대 5종)
- [x] 3. Briefing·Office·Calendar·FormExport·Observations와 model(briefing 전날·반복 종료일 판정)·forms(기간 일수)·office(validDate)를 dates.mjs로 교체. utcDayBefore → earliestLocalDay: 시간대 표시가 없는 시각은 적힌 날짜 그대로(엄격), 있으면 UTC 날짜-1일
- [x] 4. 전체 검사·기록. 시간대에 기대던 기존 테스트 자료 2곳(store 반복 일정, office 브리핑)을 지역 시각으로 바꿔 5개 시간대 모두 통과

## 재개 위치
Codex 검증: shared/dates.mjs·dates.d.mts, shared/model.mjs(earliestLocalDay·addDays), shared/office.mjs(validDate = validDateKey), shared/forms.mjs(daysInclusive), 화면 5곳. 동작 불변 확인: 주간 띠·사무소 주간표·달력 주간/목록·양식 기본 기간·단속 집계 기간. 시간대 5종으로 `TZ=... npm test`. 다음: TASK-CALENDAR-04.

## 테스트 상태
Linux Node 22(2026-10-18): `npm test` 91/91을 Asia/Seoul·UTC·America/Los_Angeles·Pacific/Kiritimati·Pacific/Pago_Pago 5개 시간대에서 모두 통과(변경 전에는 LA에서 2~3건 실패). `npm run test:desktop` 8개 진입점 통과, 화면 검사 142·실패 0, 업무 흐름 11/11. Node 24·Windows Actions는 PR #1에서 확인.

## 검증 기록

## Codex 검증에서 넘긴 경계 (2026-10-18)

P3 비차단: `utcDayBefore`는 Date.parse를 사용하므로 offset 없는 timestamp와 명백히 역순인 반복 종료일을 가진 외부 생성 자료의 허용 결과가 호스트 시간대마다 다를 수 있다. 예: at=2026-10-18T00:30:00, repeatUntil=2026-10-16은 서울/키리티마티에서 허용되지만 UTC/파고파고에서 거부된다. 정상 자료600개(저장/읽기5TZ·날짜경계4종·시각3종·offset유무2)의 읽기는 모두 통과했다. 현재 UI가 만드는 정상 저장 자료의 차단 결함은 아니다. 날짜 유틸 통합 시 허용 범위를 명시한 회귀를 추가하고 검증 정책을 일관되게 유지한다. 이번에는 저장 정책을 임의로 바꾸지 않았다.

### Codex 독립 검증 — 2026-10-18

기준75f04e9과 소규모 보완을 승인. Node24 전체91개를5TZ 각각, desktop8진입점·UI142·흐름11 통과. 서울/뉴욕 실제 앱의 DST·월경계5화면과 자료1800회 교차 읽기·원문 보존 승인. 일반 날짜 동작 불변, 역순 외부 일정의 엄격화는 카드에 명시된 정책과 일치한다. 새 month 함수의0000~0099년 보정(P3)은 TASK-REVIEW-DATES-01에서 보완·회귀 추가 후 승인받았다. 기준75f04e9 Windows39107140819 성공, 보완본은 후속 확인. [상세 검토](../reviews/2026-10-18-codex-dates.md).
