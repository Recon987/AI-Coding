---
id: TASK-PATROL-02
title: 순찰 종류·위반 유형 선택 필드와 기간별 집계
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
[도메인 D2](../reviews/2026-10-16-domain.md), [UX T5](../reviews/2026-10-16-ux.md). 단속·안전 실적을 셀 수 없음.

## 완료 조건
- [ ] v3 선택 필드 `patrolKind`, `observations[]`(유형·건수·계도/과태료 구분) — 없는 구버전 자료 정상 로드
- [ ] 유형 목록은 코드 상수가 아닌 설정 가능한 목록(과태료 금액은 저장하지 않음)
- [ ] 순찰 화면에서 기간·유형별 합계, T5 과업 완료
- [ ] `npm test`, `npm run test:desktop` 통과

- [ ] 순찰에 담당구역 번호(선택 문자열), 단속 기록에 위도·경도(선택, 기존 좌표 검증 재사용)
- [ ] 범용 사용: 순찰 종류·위반 유형을 쓰지 않는 직원에게 입력 부담이 늘지 않음(모두 선택 사항)

## 사용자 결정
모든 직원 범용, 담당구역 번호 + 단속은 위경도, 양식은 앱이 추천하고 사용자 피드백(2026-10-16, docs/research/knps-domain.md 7장).

## 범위 밖
위반자 인적사항(암호화 전 금지), 공식 단속 대장 대체.

## 진행 단계
- [x] 1. 설계·모델: Patrol 선택 필드 kind(7종)·zone(≤50자)·observations[](id·type≤50·count 1~9999·outcome guidance/fine/other·coordinates?·note≤500, 기록당 50개). 유형은 자유 입력 + 제안(기본 10종 ∪ 이미 쓴 유형) — 별도 설정 저장소 없이 '쓰면서 늘어나는 목록'. shared/model.mjs patrolSummary·observationTypes·describeObservations, 브리핑 TXT 반영, tests/patrol-observations.test.cjs
- [ ] 2. 구현
- [ ] 3. 테스트·문서

## 재개 위치
2단계 UI: src/components/Patrols.tsx 편집창(순찰 종류·담당구역·단속·확인 건 목록 + 건별 위경도), 목록 표시(종류·구역·건 요약), 기간 집계 패널(이번 주/이번 달/최근 30일), 검색 포함.

## 테스트 상태
2026-10-16: TZ=UTC `npm test` 55/55. UI 미구현.

## 검증 기록
