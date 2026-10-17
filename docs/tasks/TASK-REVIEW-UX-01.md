---
id: TASK-REVIEW-UX-01
title: 핵심 과업별 조작 수·시간 측정과 사용 흐름 검토
status: review
role: verifier
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends:
priority: P1
updated: 2026-10-16
---

## 배경
기능은 많지만 실제 과업(출근 확인, 현장 복귀 후 순찰 기록, 인계 작성, 제출 마감 확인, 퇴근 전 브리핑 출력)에 몇 번의 조작이 드는지 측정한 적이 없다.

## 완료 조건
- [x] 과업 8개 정의와 Electron 자동 측정(클릭·입력 칸·글자·화면 이동·화면 밖, 실패 지점)
- [x] review-lenses B·D·E 점수와 발견 표 `docs/reviews/2026-10-16-ux.md`
- [x] 측정 스크립트를 반복 실행 가능하게 저장(가상 자료만 사용): `npm run review:flows`

## 범위 밖
UI 수정(발견은 카드로 분리).

## 진행 단계
- [x] 1. 과업 정의
- [x] 2. 측정 스크립트
- [x] 3. 결과와 발견 정리

## 재개 위치
Codex 검증: Node 24에서 `npm run review:flows` 재실행해 수치 비교, U1(편집창 닫기 비정상 종료) 재현 절차를 Windows에서 확인.

## 테스트 상태
2026-10-16 Linux Node 22: `npm run review:flows` 오류 0(T5·T6은 기능 부재로 '실패' 기록), `npm test`·`npm run test:desktop` 결과는 커밋 메시지 참조.

## 검증 기록


### Codex 검증 (2026-10-16)

기준73c938e 및 task/task-review-claude-01의 보완본 검토. 업무 흐름10/10 재현. 당직명은 aria/title 전체값 기준, 화면에는 일부 생략 가능. Node24 npm test70/70·전체test:desktop·UI142·업무흐름10/10 통과. 상세 재현/제약: [독립 검토 기록](../reviews/2026-10-16-codex-claude.md). main 미병합이므로 status는 review 유지.
