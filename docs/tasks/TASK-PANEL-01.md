---
id: TASK-PANEL-01
title: 5개 역할 교차 검토·협의로 다음 개선 묶음 선정과 구현
status: review
role: orchestrator
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends:
priority: P1
updated: 2026-10-18
---

## 배경
사용자 요청(2026-10-18): "역할을 다섯 개로 나눠서 서로 검토한 후 상의해서 좋은 프로그램으로 개선". 5주기 개선 루프로 진행한다.
역할: ① 현장 직원(도메인) ② UX·시각 디자인 ③ 자료 안전·보안 ④ 접근성·키보드 ⑤ 코드 품질·테스트. 총괄(Claude)이 협의를 정리한다.

## 완료 조건
- [x] 5개 역할 1차 검토 결과를 `docs/reviews/2026-10-18-panel.md`에 남긴다(역할별 발견·근거·심각도)
- [x] 2차 교차 검토: 각 역할이 다른 4개 역할의 발견에 찬성/반대/우선순위 의견을 낸다
- [x] 합의안: 채택·보류·기각과 이유, 채택 항목은 카드 또는 이 카드의 구현 단계로
- [x] 합의된 구현 항목(이 세션 크기)을 구현하고 테스트를 추가한다
- [x] 구현 결과를 원 제안 역할이 재검토(구현자와 다른 시각)
- [x] `npm test`, `npm run test:desktop` 통과

## 범위 밖
사용자 승인이 필요한 범위 변경(암호화 설계, 공식 서식 확정, 서버 연동). 이런 발견은 backlog 카드로만 남긴다.

## 진행 단계
- [x] 1. 1차 검토(5개 역할 병렬) — 발견 40건(D8·U8·S8·A8·C8), docs/reviews/2026-10-18-panel.md
- [x] 2. 2차 교차 검토·합의안 — 반대 2건(U2 hover 철회·S8 보류), 묶음 A(S1·S4+S6+S2편집보존·C1·A1)·B(D1·D2), 다음 주기 카드 5장(EDITOR·DATES·LABELS·SCHEMA·A11Y-02)
- [x] 3. 합의 구현 묶음 A: S1(model.mjs utcDayBefore) → S4+S6+S2(store.cjs withRetry·recovery 잠금 다시 시도·백업 새 이름·메모/일정 편집 필드 보존) → C1(shared/search.mjs) → A1(ListRow '<동작> · <제목>', 근무표 셀 이름)
- [x] 4. 합의 구현 묶음 B(D1 a1db8b3·D2 0a958a2)·원 제안 역할 재검토(3차) → 수정 a2d81e3·12e7b62
- [x] 5. 기록(loop-log 5주기, handoff, 다음 주기 카드 6장: EDITOR-01·DATES-01·LABELS-01·SCHEMA-01·A11Y-02·LIST-02)

## 재개 위치
Codex 검증: docs/reviews/2026-10-18-panel.md '합의안'·'3차' 표와 커밋 32ad74f~12e7b62 대조. 핵심 확인: (1) shared/model.mjs `utcDayBefore` 읽기 여유 하루와 Calendar 편집기 엄격 검사, (2) desktop/store.cjs `withRetry`·`isTransientLock`·`retry.wait`와 desktop/recovery.cjs 잠금 다시 시도(Windows 실기기 미검증), (3) shared/search.mjs, (4) ListRow sr-only 이름·Office 근무표 셀, (5) briefing 근무·당직/전날 단속 절, (6) Patrols.tsx `prefillOf`·`newPatrolDraft`·`patrolAutoTitle`. Node 24에서 npm test·test:desktop 재실행.

## 테스트 상태
12e7b62 기준 Linux Node 22: `npm test` 89/89, `npm run test:desktop` 8개 스모크 통과, review:flows 11개 완료(T2c 복사 입력 3클릭·1칸·5자 vs T2 5·6·39), review:ui strict+zoom 142·실패 0(0a958a2 기준). Windows Actions: 32ad74f 실패(store 테스트 기대값, 547d746에서 수정), 547d746~a1db8b3 성공, 이후는 PR #1에서 확인.

## 검증 기록
- 2026-10-18 역할 내 교차 재검토(3차, 구현자와 다른 역할 에이전트): 안전 5/5 승인, 접근성 A1 승인·D2 수정, 현장 D1 승인·D2 수정, UX 4 승인·4 수정, 코드 3 승인·3 수정 → a2d81e3·12e7b62에서 반영. **카드 검증자(Codex) 검증은 아직 없음.**
