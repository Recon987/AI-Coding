---
id: TASK-A11Y-02
title: 입력 테두리 대비·고대비 모드(A4)·상시 라이브 영역(A5)·좁은 폭 2줄(A6)·단축키(A8)
status: in-progress
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends:
priority: P2
updated: 2026-10-18
---

## 배경
[5개 역할 교차 검토 합의안](../reviews/2026-10-18-panel.md#합의안-총괄-정리-2026-10-18) 다음 주기 카드.

## 완료 조건
- [ ] input·select·checkbox 테두리만 3:1 이상(--surface·--page 양쪽), 카드·구분선은 그대로, @media (forced-colors: active), 검색 포커스 표시
- [ ] A1 잔여: 오늘 상태 띠·주간 날짜·월간 칸 이름을 보이는 글자로 시작(ISO 날짜로 시작하지 않음; MonthGrid.tsx 날짜 버튼 aria-label 포함)
- [ ] 시각 알림 8초 이상 또는 닫기 버튼
- [ ] 알림·검색 결과 건수를 항상 있는 라이브 영역으로
- [ ] 좁은 폭 달력 칩·당직 타일·근무표 셀 2줄 허용(CALENDAR-04 검증: 960px 월간 칸 기록 이름이 한두 글자로 잘림)
- [ ] '/' 한 글자 단축키 제거 또는 수식키 조합
- [ ] `npm test`, `npm run test:desktop` 통과

## 범위 밖
합의안의 보류·기각 항목.

## 진행 단계
- [x] 1. 검토 문서 A4·A5·A6·A8과 2·3차 조건 재확인(UX: 테두리 강화는 입력칸만, 2줄은 1200px 이하·목록 행은 1줄 유지 / 안전: '/' 단축키는 설정 추가보다 제거 권장)
- [x] 2. A4: 입력칸 테두리 대비 3:1, forced-colors, 검색 포커스 표시
- [x] 3. A5: 상시 라이브 영역·알림 8초+닫기, 검색 결과 건수 낭독, 오늘 상태 띠 group
- [ ] 4. A1 잔여: 주간 띠·월간 칸 이름을 보이는 글자로 시작
- [ ] 5. A6 좁은 폭 2줄, A8 '/' 단축키 제거(Ctrl+K 유지)
- [ ] 6. 검사·기록

## 재개 위치
4단계 A1 잔여: Briefing.tsx 주간 띠 버튼 aria-label(현재 ISO 시작), calendar/MonthGrid.tsx 날짜 버튼 aria-label을 보이는 글자(요일·일)로 시작하게. 테스트 선택자(desktop-smoke·recurrence-smoke·list-smoke·calendar-smoke의 ISO 이름) 갱신. 3단계 완료: main.tsx 상시 라이브 영역·알림 8초·닫기, 검색 결과 건수 role=status(통합·순찰·업무·메모), 오늘 상태 띠 role=group.

## 테스트 상태
미실행

## 검증 기록
