---
id: TASK-PANEL-01
title: 5개 역할 교차 검토·협의로 다음 개선 묶음 선정과 구현
status: in-progress
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
- [ ] 합의된 구현 항목(이 세션 크기)을 구현하고 테스트를 추가한다
- [ ] 구현 결과를 원 제안 역할이 재검토(구현자와 다른 시각)
- [ ] `npm test`, `npm run test:desktop` 통과

## 범위 밖
사용자 승인이 필요한 범위 변경(암호화 설계, 공식 서식 확정, 서버 연동). 이런 발견은 backlog 카드로만 남긴다.

## 진행 단계
- [x] 1. 1차 검토(5개 역할 병렬) — 발견 40건(D8·U8·S8·A8·C8), docs/reviews/2026-10-18-panel.md
- [x] 2. 2차 교차 검토·합의안 — 반대 2건(U2 hover 철회·S8 보류), 묶음 A(S1·S4+S6+S2편집보존·C1·A1)·B(D1·D2), 다음 주기 카드 5장(EDITOR·DATES·LABELS·SCHEMA·A11Y-02)
- [x] 3. 합의 구현 묶음 A: S1(model.mjs utcDayBefore) → S4+S6+S2(store.cjs withRetry·recovery 잠금 다시 시도·백업 새 이름·메모/일정 편집 필드 보존) → C1(shared/search.mjs) → A1(ListRow '<동작> · <제목>', 근무표 셀 이름)
- [ ] 4. 합의 구현 묶음 B(D1·D2)·원 제안 역할 재검토
- [ ] 5. 기록(loop-log 5주기, handoff)

## 재개 위치
4단계 묶음 B: D1 shared/model.mjs briefing()에 '당직' 절(당직자 이름만, 근무는 건수)·'전날 단속·확인' 절, 하단 경고에 '직원 이름 포함', 날짜 검사 validDate. 그다음 D2 src/components/Patrols.tsx blank() 기본값(at이 가장 늦은 순찰의 기록자·종류·구역), 제목 선택·자동 생성(≤500자), '이 기록으로 새 순찰'(새 id, observations·좌표·확인 사항 제외), 폼 순서=DOM 순서, 측정 tests/task-flows.cjs T2(기준 5클릭·6칸·39자).

## 테스트 상태
묶음 A 후(Linux Node 22): `npm test` 87/87, `npm run test:desktop` 8개 통과, review:flows 10개 완료. C1 후: `npm test` 87/87 통과. S4·S6·S2 후: 85/85. S1 후: 83/83(32ad74f 시점 store.test 1건 실패 → 다음 커밋에서 기대값 조정: 읽기 검증은 시간대 여유 하루, 편집기는 지역 날짜 엄격 검사 유지). 데스크톱 스모크 미실행.

## 검증 기록
