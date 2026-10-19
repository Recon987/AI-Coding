---
id: TASK-PATROL-02
title: 순찰 종류·위반 유형 선택 필드와 기간별 집계
status: done
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends: 
priority: P1
updated: 2026-10-19
---

## 배경
[도메인 D2](../reviews/2026-10-16-domain.md), [UX T5](../reviews/2026-10-16-ux.md). 단속·안전 실적을 셀 수 없음.

## 완료 조건
- [x] v3 선택 필드 `patrolKind`, `observations[]`(유형·건수·계도/과태료 구분) — 없는 구버전 자료 정상 로드
- [x] 유형 목록은 코드 상수가 아닌 설정 가능한 목록(과태료 금액은 저장하지 않음) — 기본 제안 + 사용자가 입력한 유형이 다음부터 제안됨(별도 관리 화면은 없음)
- [x] 순찰 화면에서 기간·유형별 합계, T5 과업 완료
- [x] `npm test`, `npm run test:desktop` 통과

- [x] 순찰에 담당구역 번호(선택 문자열), 단속 기록에 위도·경도(선택, 기존 좌표 검증 재사용)
- [x] 범용 사용: 순찰 종류·위반 유형을 쓰지 않는 직원에게 입력 부담이 늘지 않음(모두 선택 사항)

## 사용자 결정
모든 직원 범용, 담당구역 번호 + 단속은 위경도, 양식은 앱이 추천하고 사용자 피드백(2026-10-16, docs/research/knps-domain.md 7장).

## 범위 밖
위반자 인적사항(암호화 전 금지), 공식 단속 대장 대체.

## 진행 단계
- [x] 1. 설계·모델: Patrol 선택 필드 kind(7종)·zone(≤50자)·observations[](id·type≤50·count 1~9999·outcome guidance/fine/other·coordinates?·note≤500, 기록당 50개). 유형은 자유 입력 + 제안(기본 10종 ∪ 이미 쓴 유형) — 별도 설정 저장소 없이 '쓰면서 늘어나는 목록'. shared/model.mjs patrolSummary·observationTypes·describeObservations, 브리핑 TXT 반영, tests/patrol-observations.test.cjs
- [x] 2. 구현: src/components/Observations.tsx(ObservationEditor·PatrolSummary), Patrols.tsx(종류·담당구역·건 목록·검색·표시), style.css
- [x] 3. 테스트·문서: tests/patrol-observations.test.cjs, task-flows T2b·T5, README·architecture, 캡처 docs/ui-review/cycle2/patrol-*.png

## 재개 위치
**완료**: 2026-10-19 사용자 승인으로 PR Recon987/AI-Coding#1(claude/zen-cannon-wc1at4)을 main에 병합(merge commit). 이전 메모: Codex 검증: shared/model.mjs normalize의 순찰 선택 필드 검증·patrolSummary, Observations.tsx, Patrols.tsx 저장 시 빈 선택 필드 제거, 측정 T2(부담 불변 5클릭·6칸·39자)·T2b·T5(1클릭). 사용자 피드백: 순찰 종류 7종과 기본 유형 10종이 실제 업무 용어와 맞는지.

## 테스트 상태
2026-10-16 Linux Node 22: `npm test` 55/55(TZ=UTC 포함), `npm run test:desktop` 통과, review:ui strict 134 통과·외부 요청 0, review:flows T5 완료(1클릭).

## 검증 기록


### Codex 검증 (2026-10-16)

기준73c938e 및 task/task-review-claude-01의 보완본 검토. 선택 필드 하위 호환·좌표·건수 가중 집계·TXT/CSV 일치 승인. Node24 npm test70/70·전체test:desktop·UI142·업무흐름10/10 통과. 상세 재현/제약: [독립 검토 기록](../reviews/2026-10-16-codex-claude.md). main 미병합이므로 status는 review 유지.
