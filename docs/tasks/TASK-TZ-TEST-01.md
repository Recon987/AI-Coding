---
id: TASK-TZ-TEST-01
title: '고발·인계' minReader 테스트를 실행 시간대와 무관하게 고정
status: done
role: builder
owner: claude
verifier: codex
branch: claude/great-feynman-xoqn7u
depends:
priority: P2
updated: 2026-10-20
---

## 배경
`tests/schema.test.cjs`의 "'고발·인계'를 쓰는 자료는 minReader 2로 저장되고, 지운 뒤에도 낮추지 않는다" 테스트가 `TZ=America/New_York`, `TZ=Pacific/Honolulu`에서 실패하고 `Asia/Seoul`, `UTC`, `Pacific/Kiritimati`에서는 통과했다. TASK-AX-DATES-01 이전 코드에서도 같은 방식으로 실패하므로 앱 회귀가 아니라 테스트 자료 문제다.

원인: 순찰 자료의 `at`이 `"2026-10-19T10:00:00+09:00"`(한국 시각 고정)인데 `patrolSummary(data, { startDate: "2026-10-19", endDate: "2026-10-19" })`와 `buildForm(...)`은 실행 기기의 지역 날짜로 묶는다. 미국 시간대에서는 이 기록이 2026-10-18로 떨어져 2026-10-19 기간 집계·양식에서 빠진다.

## 완료 조건
- [x] 테스트 자료의 `at`을 오프셋 없는 지역 시각 `"2026-10-19T10:00:00"`으로 바꾼다(`tests/recurrence-occurrences.test.cjs`와 같은 방식). 앱 코드는 바꾸지 않는다.
- [x] 검사 내용(minReader 2 저장·보호본·집계 행·양식 TXT/CSV 문구·지운 뒤 유지)을 줄이지 않는다.
- [x] `Asia/Seoul`, `UTC`, `America/New_York`, `Pacific/Kiritimati`, `Pacific/Honolulu` 다섯 시간대에서 `npm test` 통과
- [x] `npm run test:desktop` 통과

## 범위 밖
- 앱의 날짜 묶음 기준(지역 날짜) 변경
- 다른 테스트·데스크톱 스모크의 `+09:00` 시계 고정(이들은 `page.clock`으로 시각을 고정하며 이번 실패와 무관)

## 진행 단계
- [x] 1. 원인 재현: 수정 전 `TZ=America/New_York npm test`에서 해당 테스트 1건 실패 확인
- [x] 2. `tests/schema.test.cjs` 순찰 자료 `at`에서 `+09:00` 제거
- [x] 3. 다섯 시간대 `npm test` 실행
- [x] 4. `npm run test:desktop` 실행 후 검증 요청

## 재개 위치
완료(2026-10-20 사용자 승인으로 main 병합, 9주기). 사후 검증에서 결함이 나오면 새 카드로 처리한다.

## 테스트 상태
- 수정 전 `TZ=America/New_York npm test`: 실패 1건(위 테스트, 2026-10-19 기간 집계에서 기록 누락)
- 수정 후 `npm test`: Asia/Seoul·UTC·America/New_York·Pacific/Kiritimati·Pacific/Honolulu 모두 131/131 통과
- `npm run test:desktop`(Linux, 기본 시간대): 통과(종료 코드 0, 외부 요청 0건)

## 검증 기록

### 2026-10-20 작업 브랜치 통합 (Claude, 총괄)
- 이 카드의 브랜치(`claude/great-feynman-xoqn7u`, 기준 1eb40aa)를 `claude/zen-cannon-wc1at4`(main a70d9aa 위)에 merge commit e861688로 통합. 충돌 없음.
- 통합 후 현재 코드에서 시간대 5종(서울·UTC·뉴욕·키리티마티·호놀룰루) 모두 `npm test` 161/161 통과. 8주기 기록에 남긴 '뉴욕·호놀룰루에서 schema 1건 실패'가 해소됐다.
- 바뀐 것은 검사 자료 한 줄(tests/schema.test.cjs)과 문서뿐이라 `npm run test:desktop`은 통합 뒤 다시 돌리지 않았다(카드 브랜치에서 통과 기록).
- 구현 세션과 통합한 쪽이 모두 Claude이므로 독립 검증은 Codex가 한다(사후 검증 4건과 함께).

### 2026-10-20 Codex 추가 독립 검증
승인. 테스트 자료의 오프셋 한 줄만 바뀌고 minReader·집계·양식 등의 기존 검증을 줄이지 않았다. 519b7cc 통합본의 전체 npm test5개 시간대 각각167/167 통과. 총괄 병합 대기(review 유지). 전체 desktop18+감사3(9/9), Windows39358186950 소스/패키지 로그 대조 완료. 상세는 위 검토 문서.

### 2026-10-20 사용자 병합 승인(9주기)
- 사용자: "main 병합 승인할게, 병합해". Codex 승인(2026-10-20 디스패치 검증).
- 병합 전: Linux Node 22 `npm test` 169/169(시간대 5종), `npm run test:desktop` 종료 0(진입점 18 + 감사 3), 화면 검사 150·실패 0, 업무 과업 11/11, Codex 감사 desktop-nav-zones-audit 5/5·postmerge-boundary-audit 3/3. Windows 39365534106(49bbeb1) 성공.
