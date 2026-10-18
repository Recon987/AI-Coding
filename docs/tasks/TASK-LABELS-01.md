---
id: TASK-LABELS-01
title: 라벨·허용값 단일화(C3)·누락 테스트(C8)·버튼 문구 상수화(U6)
status: backlog
role: builder
owner: none
verifier: claude
branch: task/task-labels-01
depends:
priority: P2
updated: 2026-10-18
---

## 배경
[5개 역할 교차 검토 합의안](../reviews/2026-10-18-panel.md#합의안-총괄-정리-2026-10-18) 다음 주기 카드.

## 완료 조건
- [ ] 위험 등급·근무 그룹·반복 문구를 shared 한 곳에서 정의, 허용값 스냅샷 테스트(라벨 추가가 곧 enum 확장임을 테스트로 드러냄)
- [ ] describeObservations 테스트, FORM_FORMATS 미사용 정리
- [ ] U6 '추가/등록' 단어는 사용자 확인 후 상수로 통일, 스모크도 상수를 읽음
- [ ] `npm test`, `npm run test:desktop` 통과

## 범위 밖
합의안의 보류·기각 항목.

## 진행 단계
- [ ] 1. 착수 시 검토 문서의 해당 발견과 2차 조건을 다시 읽고 단계를 나눈다

## 재개 위치
착수 전.

## 테스트 상태
미실행

## 검증 기록
