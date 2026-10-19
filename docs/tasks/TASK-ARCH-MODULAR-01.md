---
id: TASK-ARCH-MODULAR-01
title: 모듈형 플랫폼·AX Desk 개편 명세 보정 및 후속 구현
status: ready
role: orchestrator
owner: none
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
- [x] 현재 앱0.8.0·version3 저장 계약과 대조한 보정 명세 작성
- [x] 선행 BK-01·HL-01 보완 및 후속 6카드 main 병합(2026-10-19 사용자 승인, PR #13). BK-01·HL-01의 Codex 독립 재검증은 병합 뒤
- [ ] Step A: 선택적 modules·AX 모델과 무손실 전환/백업 검증
- [ ] Step B: 코어4종·기존 기능 보존·내장 모듈 관리/동적 메뉴 검증
- [ ] Step C: AX 사업·스니펫·보고서 초안과 브리핑/내보내기 검증
- [ ] 단계별 npm test·test:desktop·독립 검증·Windows 확인 후 통합

## 재개 위치
2026-10-19 Claude(총괄)가 Step A~C를 하위 카드 5장으로 나눴다: TASK-MODULES-01(Step A) → TASK-MODULES-02(Step B) → TASK-AXDESK-01·02·03(Step C). 이 카드는 묶음 카드이며 하위 카드가 모두 done이면 done. 사용자 지정 브랜치 feat/modular-architecture는 클라우드 세션 제약으로 claude/zen-cannon-wc1at4를 쓴다(README 3장 규칙).

## 테스트 상태
main1474d76 기반 문서 브랜치 Node24: npm test91/91·npm run test:desktop10개 진입점 통과(타입/빌드 포함). 원문 SHA256 대조 일치·보드/공백 검사 통과. 제품 코드는 변경하지 않았으며 AX 신규 기능·AX 검사·개편 Windows 빌드는 미구현/미실행.

## 검증 기록
명세 검토 결과는 보정 문서와전용 인계장에 기록한다. blocked는 환경 오류가 아니라 사용자가 지정한 구현 선행 조건 미충족을 뜻한다.

### 2026-10-19 Codex 명세 검토
실제 필드version/events/notes/calls를 보존하고, 이미v3인 자료를schemaVersion2→3으로 잘못 전환하지 않도록 보정했다. 실제 메뉴 소유 파일main.tsx, 사무소/통제/바로가기 접근 보존, 정적 내장 모듈·알 수 없는ID 보존, 초기 예제 재주입 방지, 마일스톤 원본 파생, 오프라인 보고서 템플릿·명시적 내보내기를 수용 조건으로 구체화했다. 사용자 선행 조건 미충족으로 제품 구현은 시작하지 않았다. 후속6카드가main에 없어서 이main 기반 보드의 상태는 원격 검증 브랜치의 최신 판정과 다를 수 있다. PR #11과실제 병합 SHA를 기준으로 재개한다.
