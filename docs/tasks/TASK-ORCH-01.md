---
id: TASK-ORCH-01
title: 에이전트 역할·과제 카드·개선 루프 운영 체계 도입
status: done
role: orchestrator
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends:
priority: P0
updated: 2026-10-19
---

## 배경
Codex·Gemini·Claude가 모두 `main`에 직접 커밋하고 `docs/handoff.md` 하나에 상태를 덮어써서, 누가 어디까지 했는지 헷갈리고 시간 한도에 걸리면 작업이 중간에 사라질 위험이 있었다. 웹 업로드 커밋(`2f9b396`, `c32d590`)은 TASK 식별자·테스트 기록 없이 `main`에 들어갔다.

## 완료 조건
- [x] 역할·과제 수명주기·체크포인트·개선 루프 문서 (`docs/orchestration/`)
- [x] 과제 카드 양식과 초기 백로그 (`docs/tasks/`)
- [x] `npm run board` 현황판, `npm test`에서 카드 규칙 검사
- [x] `CLAUDE.md`, `GEMINI.md`가 `AGENTS.md`를 가리킴
- [x] Windows Actions가 `main` 대상 PR에서도 실행
- [ ] 다른 에이전트(Codex)가 문서를 읽고 카드 하나를 규칙대로 선점·체크포인트·검증 요청할 수 있는지 확인

## 범위 밖
앱 코드·데이터 형식 변경 없음. 정기 자동 실행(스케줄)은 사용자가 켤 때만.

## 진행 단계
- [x] 1. 운영 문서 작성
- [x] 2. 카드 검사 스크립트와 테스트
- [x] 3. 초기 카드 작성(직전 검토 결과 반영)
- [x] 4. AGENTS.md·handoff.md·CI 갱신
- [ ] 5. Codex 검증

## 재개 위치
**완료**: 2026-10-19 사용자 승인으로 PR Recon987/AI-Coding#1(claude/zen-cannon-wc1at4)을 main에 병합(merge commit). 이전 메모: Codex가 이 브랜치를 받아 `npm run board`, `npm test`를 실행하고 `docs/orchestration/README.md` 4장 순서대로 TASK-DATA-01을 선점해 본다. 막히는 규칙이 있으면 이 카드의 검증 기록에 적는다.

## 테스트 상태
2026-10-16 Linux(Node 22): `npm test` 통과, `npm run test:desktop` 통과(Linux 트레이 미실행). 숫자는 커밋 메시지·인계 패킷 참조.

## 검증 기록
(검증 대기)


### Codex 검증 (2026-10-16)

기준73c938e 및 task/task-review-claude-01의 보완본 검토. 보드·규칙 검증·별도 검증 카드 선점과 체크포인트 푸시 실제 실행. Node24 npm test70/70·전체test:desktop·UI142·업무흐름10/10 통과. 상세 재현/제약: [독립 검토 기록](../reviews/2026-10-16-codex-claude.md). main 미병합이므로 status는 review 유지.
