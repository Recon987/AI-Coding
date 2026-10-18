---
id: TASK-A11Y-02
title: 입력 테두리 대비·고대비 모드(A4)·상시 라이브 영역(A5)·좁은 폭 2줄(A6)·단축키(A8)
status: review
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
- [x] input·select·checkbox 테두리만 3:1 이상(--surface·--page 양쪽), 카드·구분선은 그대로, @media (forced-colors: active), 검색 포커스 표시
- [x] A1 잔여: 오늘 상태 띠·주간 날짜·월간 칸 이름을 보이는 글자로 시작(ISO 날짜로 시작하지 않음; MonthGrid.tsx 날짜 버튼 aria-label 포함)
- [x] 시각 알림 8초 이상 또는 닫기 버튼
- [x] 알림·검색 결과 건수를 항상 있는 라이브 영역으로
- [x] 좁은 폭 달력 칩·당직 타일·근무표 셀 2줄 허용(CALENDAR-04 검증: 960px 월간 칸 기록 이름이 한두 글자로 잘림)
- [x] '/' 한 글자 단축키 제거 또는 수식키 조합
- [x] `npm test`, `npm run test:desktop` 통과

## 범위 밖
합의안의 보류·기각 항목.

## 진행 단계
- [x] 1. 검토 문서 A4·A5·A6·A8과 2·3차 조건 재확인(UX: 테두리 강화는 입력칸만, 2줄은 1200px 이하·목록 행은 1줄 유지 / 안전: '/' 단축키는 설정 추가보다 제거 권장)
- [x] 2. A4: 입력칸 테두리 대비 3:1, forced-colors, 검색 포커스 표시
- [x] 3. A5: 상시 라이브 영역·알림 8초+닫기, 검색 결과 건수 낭독, 오늘 상태 띠 group
- [x] 4. A1 잔여: 주간 띠('목 15일, 2026. 10. 15. 기록 n건')·월간 칸('15일, 2026. 10. 15. (목), n건…') 이름을 보이는 글자로 시작, ui-review·recurrence-smoke 선택자 갱신
- [x] 5. A6 1200px 이하에서 달력 칩·당직 칸·근무표 칸 2줄(목록 행은 1줄 유지), A8 '/' 단축키 제거(Ctrl+K 유지, 앱 안내 문구 수정)
- [x] 6. tests/desktop-a11y-smoke.cjs 신규(test:desktop·Windows 패키지 단계에 추가). recurrence-smoke가 날짜 이름 앞부분으로 칸을 찾던 것을 data-date로 바꾸고, 본문 오류가 정리 오류에 가려지지 않게 먼저 출력

## 재개 위치
Codex 검증: style.css(--input-line, forced-colors 블록, 1200px 이하 2줄), src/main.tsx(상시 라이브 영역·알림 8초·닫기·'/' 제거), 검색 건수 role=status(main·Patrols·Tasks·Personal), Briefing 주간 띠·today-strip, calendar/MonthGrid.tsx 날짜 이름, tests/desktop-a11y-smoke.cjs. 실제 고대비 테마·화면낭독기(NVDA) 확인은 기관 PC에서(Playwright forcedColors 에뮬레이션으로만 확인).

## 테스트 상태
Linux Node 22(2026-10-18): `npm test` 91/91, `npm run test:desktop` 10개 진입점 통과(새 a11y 검사 포함), 화면 검사 150·실패 0·외부 요청 0, 업무 흐름 11/11. Node 24·Windows Actions는 PR #1에서 확인.

## 검증 기록
