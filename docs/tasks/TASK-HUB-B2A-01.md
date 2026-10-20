---
id: TASK-HUB-B2A-01
title: B2a 사업·근거 보관함 자료 모델(projects·references·단일 사업 ID 공간)
status: review
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends: TASK-HUB-SCHEMA-01
priority: P1
updated: 2026-10-20
---

## 배경
- 의존 예외: TASK-HUB-SCHEMA-01 (사용자 승인 2026-10-20, "승인" + Gemini 확정 지시 — 명세 승인, Codex 검증 대기)

명세: [claude-hub-schema-plan-2026-10-20.md](../product/claude-hub-schema-plan-2026-10-20.md) 1·6장. 화면은 B2b에서 만든다.
- Codex B1(`workItems`)은 아직 원격에 없다. 그래서 B2a는 `workItems`를 건드리지 않는다.
- `workItems.projectId`·`referenceIds`·`source`에 공통 검증 함수를 제공한다(B1이 가져다 쓴다).

## 완료 조건
- [x] 선택 컬렉션 `projects`·`references` 검증·정규화. 이 필드가 없는 기존 파일도 무손실로 열림
- [x] `tasks`·`axProjects`의 선택 필드 `projectId?`·`referenceIds?` 검증
  - 형식만 검사하고, 끊긴 참조는 거부하지 않음
- [x] 단일 사업 ID 공간: `projects`와 `axProjects`의 ID가 겹치면 거부. 순수 함수 `projectIdSet`·`listProjects`(`ProjectView`, AX 확장 표시 여부)
- [x] 출처·근거 표시 함수: 원본 현재 제목 우선, 삭제 시 사본 제목과 "삭제된 …" 문구, 근거의 대상 없음 — B1 통합 때 출처 쪽은 B1 `links`·`sourceInfo`(+`sourceTitle`)로 옮기고 B2a의 `sourceView`는 제거(명세 7장)
- [x] 구판(reader 2) 보존, 봉함 저장·암호 백업 왕복, 10,000건 혼합 측정 기록
- [x] `npm test`, `npm run test:desktop` 통과(Windows는 화면 변경이 없어 B2b에서 함께 — 미실행)

## 범위 밖
화면(B2b), `workItems` 컬렉션 자체(B1, Codex), 회의(`meetings`), AX 저장소 통합.

## 진행 단계
- [x] 1. `shared/projects.mjs` 순수 함수·라벨과 단위 검사
- [x] 2. `shared/model.mjs` 연결, 타입(`src/types.ts`, `.d.mts`), 호환·봉함·측정 검사
- [x] 3. 기록·검증 요청

## 재개 위치
구현 끝, Codex 검증을 기다린다(review).
검증 지점:
- 검사: `tests/projects.test.cjs`, `tests/labels.test.cjs`(projectStage·referenceKind)
- 끊긴 참조를 거부하지 않는지
- 일반·AX 사업 ID 충돌 거부
- `READER_VERSION` 불변
- 측정 스크립트 `scripts/hub-bench.cjs`

B1(Codex)에 주는 공용 함수는 다음과 같다.
- `workItems.projectId`: `projectIdSet(data)`로 확인한다.
- `referenceIds`: `validReferenceIds`로 확인한다.
- `source`: `validateSource`로 검증하고 `sourceView`로 표시한다.

Windows Actions는 화면 변경이 없어 B2b와 함께 돌린다(아직 실행하지 않음).

## 측정(10,000건 혼합, `node scripts/hub-bench.cjs`)
- 조건: Node v22(개발 기준 24와 다름), Xeon 2.8GHz 클라우드, 2026-10-20.
- 자료: 사업 1,000, AX 500, 근거·메모·전화·인계·작업(workItems 형태) 각 2,500.

| 항목 | 값 |
| --- | --- |
| 평문 크기 | 10.34MB(한도 20MB의 52%) |
| 정규화 | 10ms |
| 저장 평문(last-good 포함) / 읽기 | 149ms / 102ms |
| 저장 봉함 / 봉한 크기 / 읽기 | 304ms / 13.79MB / 267ms |
| 암호 백업 쓰기 / 읽기(N=2^17) | 788ms / 991ms |

이 조건이면 JSON 유지 판단에 무리가 없다. 다만 기관 PC에서 다시 재야 한다. 링크·근거가 많은 자료에서는 종류별 10,000건 한도가 크기 한도보다 먼저 걸린다.

## 검증 기록
