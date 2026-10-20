---
id: TASK-HUB-SCHEMA-01
title: 업무 허브 v3 확장 스키마·모듈 계약·B2/B3 분할안(Gemini 지시 반영)
status: done
role: design
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends:
priority: P1
updated: 2026-10-20
---

## 배경
사용자가 전달한 "[GEMINI → CLAUDE: B1~B3 데이터 모델·모듈 계약·개발 계획 정렬 지시]"(2026-10-20)를 반영하는 문서 전용 과제다. 입력은 통합안 b36307a와 B1 검토 1c4caaa다. 제품 코드와 Codex B1 구현은 수정하지 않는다.

## 완료 조건
- [x] 쟁점 3가지(사업 통합·출처/근거 관계·판독 수준) 결정 반영과 조정 근거
- [x] B1 데이터·상태 불변 조건(사업·기한 무강제, 상태 비전파, 라벨)
- [x] v3 확장 스키마 명세(tasks·notes·calls·projects/axProjects·folders·references·workItems, minReader 규칙)
- [x] B2·B3 카드 분할안과 Codex/Claude 역할표
- [x] 문서 검사, 커밋·푸시

## 범위 밖
제품 코드, 카드 파일 생성·ready 확정, main 병합.

## 진행 단계
- [x] 1. 지시·통합안·코드 대조, 구판 동작 실측
- [x] 2. 명세 작성·검사·푸시

## 재개 위치
완료: [claude-hub-schema-plan-2026-10-20.md](../product/claude-hub-schema-plan-2026-10-20.md).
- Codex: B1이 `workItems`인지 `tasks.kind` 확장인지 알려 주면 1.4를 맞춘다.
- 사용자: B2a~B3b 카드 승인.

## 테스트 상태
2026-10-20:
- 문서 검사: `npm test` 196/196 통과(보드 검사 포함).
- 일회성 실측: `origin/main` 모델(reader 2)이 레코드 새 필드·새 최상위 컬렉션을 보존한다. `kind:"work"`는 거부하고, `minReader:4`이면 `NEWER_DATA`.

## 검증 기록

### 2026-10-20 사용자 명시 승인 선병합 (Codex 사후 검증 예정)
- 근거: 사용자·Gemini 지시 "[USER & GEMINI → CLAUDE: review 카드 선병합(사후 검증 조건) 승인 …]". 8·9주기와 같이 **사용자 명시 승인**으로 main에 먼저 병합한다.
- **Codex 독립 검증은 아직 받지 않았다**(사후 검증 예정). 사후 검증에서 결함이 나오면 새 카드로 보완한다.
- 병합 묶음: `claude/zen-cannon-wc1at4` + Codex B1(`task/task-hub-b1-01` d7805e5, Claude 독립 검증 통과).
