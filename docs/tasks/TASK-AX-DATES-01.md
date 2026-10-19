---
id: TASK-AX-DATES-01
title: AX 마일스톤의 100년 미만 연도 보존
status: backlog
role: builder
owner: none
verifier: codex
branch: task/task-ax-dates-01
depends:
priority: P3
updated: 2026-10-19
---

## 배경
TASK-REVIEW-MODULAR-01의 AX-DATE-01. shared/ax.mjs milestoneItems는 검증이 허용하는 0099-10-21을 new Date(y,m-1,d)의 1900 보정 때문에 1999년으로 바꾼다. 실제 업무의 2026년 정상 흐름은 통과했으며 낮은 연도 경계는 후속 보완으로 분리한다.

## 완료 조건
- [ ] 허용된 원본 날짜의 연도를 임의로 바꾸지 않는다(0001·0099·0100·2026년, 윤년, 5개 시간대).
- [ ] 기존 허용 자료를 임의 삭제·날짜 변경·손실성 거부로 처리하지 않는다. 달력/브리핑에 사용하는 날짜 키 패딩도 함께 대조한다.
- [ ] tests/modular-contract-audit.cjs의 AX-DATE-01 및 npm test·npm run test:desktop 통과. MOD-01은 다른 카드이므로 감사 두 사례의 결과를 구분한다.

## 범위 밖
이번 주 마일스톤/알림 정책, 스니펫, 보고서.

## 진행 단계
- [ ] 1. 허용 날짜를 보존하는 생성 방식과 공유 날짜 키 계약 보완
- [ ] 2. 시간대별 회귀·실제 앱 확인·증빙

## 재개 위치
착수 전. 재현은 node tests/modular-contract-audit.cjs의 AX-DATE-01. new Date(y,m-1,d) 대신 연도를 보존하는 방식으로 생성한다. 기존 날짜 유효성 검증을 임의로 좁히지 않는다.

## 테스트 상태
e6fd498의 추가 독립 감사에서 AX-DATE-01 실패(0001→1901, 0099→1999), 0100·2026은 생성 시 연도 보존.

## 검증 기록
구현 전. 우선순위 P3 후속이며 TASK-AXDESK-01의 정상 업무 기능 승인과 분리한다.
