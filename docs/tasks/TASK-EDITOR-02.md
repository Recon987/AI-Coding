---
id: TASK-EDITOR-02
title: 필드 필수/오류 연결(A3)·저장 중 포커스 유지(A2)
status: in-progress
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends:
priority: P1
updated: 2026-10-18
---

## 배경
TASK-EDITOR-01(review)에서 나눈 카드. 같은 브랜치에서 이어서 하며, EDITOR-01 병합 전이라 의존성 칸은 비운다.
[5개 역할 교차 검토 합의안](../reviews/2026-10-18-panel.md#합의안-총괄-정리-2026-10-18) 다음 주기 카드.

## 완료 조건
- [ ] Field에 required/error/hint: 레이블에 '(필수)' 글자(흐린 작은 글씨), aria-invalid·aria-describedby 자동 연결, 실패 시 첫 오류 필드 포커스, 저장 버튼 비활성화 대신 오류 안내
- [ ] hint 자리는 순찰 기본값 출처 안내와 공유
- [ ] 저장 중 즉시 동작 컨트롤은 aria-disabled+가드로 포커스 유지, `[aria-disabled=true]`에 `button:disabled`와 같은 시각 스타일
- [ ] `npm test`, `npm run test:desktop` 통과

## 범위 밖
머리 배치(TASK-EDITOR-01에서 완료).

## 진행 단계
- [x] 1. 검토 문서 A2·A3과 2·3차 조건 재확인(안전: 핸들러마다 busy 가드·저장 실패를 조용히 무시하지 않기 / 코드: 연속 동작 회귀 테스트, recurrence-smoke isDisabled 단언과 겹침)
- [x] 2. A3: Field required/hint/error, 앱 검증 오류(통제 종료일·반복 종료일·좌표·단속 건)를 필드에 연결하고 저장 버튼을 잠그지 않음, 실패 시 첫 오류 필드로 포커스
- [ ] 3. A2: 즉시 동작 컨트롤(행 동작·달력 회차·사무소 탭·메뉴)을 aria-disabled+가드로, 같은 시각 스타일
- [ ] 4. 스모크·화면 검사 갱신, 기록

## 재개 위치
3단계 A2: 시트 밖 즉시 동작(src/components/ListRow.tsx 행 동작, Calendar.tsx 회차 완료·제외, Office.tsx 탭·근무표 셀, src/main.tsx 메뉴)의 disabled={busy}를 aria-disabled+핸들러 가드로, style.css에 [aria-disabled=true] 시각 스타일, desktop-list-smoke에 '키보드로 조치 완료 후 포커스 유지'·'통제 종료일 오류 연결' 검사 추가. 2단계 완료: src/ui.tsx Field(hint·error·필수 표시)·focusFirstInvalid, Controls 종료일, Calendar 반복 종료일, Patrols 저장 버튼 잠금 해제·오류 안내, CoordinateInput 오류 연결, desktop-smoke saveBlocked.

## 테스트 상태
2단계 후: `npm test` 89/89, desktop-smoke 통과. 나머지 스모크 미실행.

## 검증 기록
