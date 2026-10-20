---
id: TASK-HUB-B2A-01
title: B2a 사업·근거 보관함 자료 모델(projects·references·단일 사업 ID 공간)
status: in-progress
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
- [ ] 선택 컬렉션 `projects`·`references` 검증·정규화. 이 필드가 없는 기존 파일도 무손실로 열림
- [ ] `tasks`·`axProjects`의 선택 필드 `projectId?`·`referenceIds?` 검증
  - 형식만 검사하고, 끊긴 참조는 거부하지 않음
- [ ] 단일 사업 ID 공간: `projects`와 `axProjects`의 ID가 겹치면 거부. 순수 함수 `projectIdSet`·`listProjects`(`ProjectView`, AX 확장 표시 여부)
- [ ] 출처·근거 표시 함수: 원본 현재 제목 우선, 삭제 시 사본 제목과 "삭제된 …" 문구, 근거의 대상 없음
- [ ] 구판(reader 2) 보존, 봉함 저장·암호 백업 왕복, 10,000건 혼합 측정 기록
- [ ] `npm test`, `npm run test:desktop` 통과(Windows는 화면 변경이 없어 B2b에서 함께)

## 범위 밖
화면(B2b), `workItems` 컬렉션 자체(B1, Codex), 회의(`meetings`), AX 저장소 통합.

## 진행 단계
- [x] 1. `shared/projects.mjs` 순수 함수·라벨과 단위 검사
- [ ] 2. `shared/model.mjs` 연결, 타입(`src/types.ts`, `.d.mts`), 호환·봉함·측정 검사
- [ ] 3. 기록·검증 요청

## 재개 위치
2단계 진행 중. 완료: `shared/projects.mjs`(+`.d.mts`), `shared/model.mjs`(`empty`·optionalCollections·검증 연결), `src/types.ts`, `tests/projects.test.cjs` 10건, `tests/labels.test.cjs` 스냅샷(projectStage·referenceKind).
다음: 10,000건 혼합 측정(`scripts/hub-bench.cjs`), `test:desktop` 전체, 기록.

## 테스트 상태
2026-10-20 중간: `npm test` 206/206, `tsc --noEmit` 통과. `test:desktop` 미실행.

## 검증 기록
