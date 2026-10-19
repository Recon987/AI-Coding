---
id: TASK-ARCH-MODULAR-01
title: 모듈형 플랫폼·AX Desk 개편 명세 보정 및 후속 구현
status: blocked
role: orchestrator
owner: codex
verifier: claude
branch: task/task-arch-modular-01
depends: TASK-SCHEMA-01, TASK-BRIEF-02, TASK-LABELS-01, TASK-FORMS-02, TASK-HOLIDAY-01, TASK-BACKUP-02
priority: P2
updated: 2026-10-19
---

## 배경
사용자가 첨부한 TASK-v0.3-ARCH-MODULAR-01을 다음 개편 명세로 전달했다. 원문은 docs/specs/modular-ax/original.md. 사용자 조건은 기존7개 카드 검증과main 병합 완료 후 착수다. 현재main1474d76에는 후속6카드가 아직 없고, PR #11 검증에서 BK-01/P1·HL-01/P2가 미해결이다.

원문의 소문자/점 포함 작업 ID는 보드 규칙에 맞춰 내부 카드 ID TASK-ARCH-MODULAR-01로 연결했다. 실제 구현 통합 브랜치는 사용자 지정 feat/modular-architecture이며 **조건 충족 후 최신main에서** 만든다. 지금 브랜치는main1474d76에서 분기한 문서 검토용이다. 기능 코드는 작성하지 않는다.

## 완료 조건·단계
- [x] 첨부 원문 보관·main/검증 브랜치 상태 확인
- [ ] 현재 앱0.8.0·version3 저장 계약과 대조한 보정 명세 작성
- [ ] 선행 BK-01·HL-01 보완 및후속6카드 독립 검증·main 병합 완료 확인
- [ ] Step A: 선택적 modules·AX 모델과 무손실 전환/백업 검증
- [ ] Step B: 코어4종·기존 기능 보존·내장 모듈 관리/동적 메뉴 검증
- [ ] Step C: AX 사업·스니펫·보고서 초안과 브리핑/내보내기 검증
- [ ] 단계별 npm test·test:desktop·독립 검증·Windows 확인 후 통합

## 재개 위치
먼저 docs/specs/modular-ax/implementation.md에 실제 version3·기존필드·오프라인 경계·누락 기능 보존·단계별 수용 조건을 보정한다. 구현은 BK-01·HL-01과main 병합 완료 전 시작하지 않는다. 이후main SHA를 고정하고 feat/modular-architecture 및 Step별 task 브랜치/카드를 만든다(추가worktree 없음).

## 테스트 상태
문서 초안 작성 중. 기능 구현·AX 테스트·새 빌드는 미실행.

## 검증 기록
명세 검토 결과는 보정 문서와전용 인계장에 기록한다. blocked는 환경 오류가 아니라 사용자가 지정한 구현 선행 조건 미충족을 뜻한다.
