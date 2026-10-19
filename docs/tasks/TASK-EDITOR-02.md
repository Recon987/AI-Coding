---
id: TASK-EDITOR-02
title: 필드 필수/오류 연결(A3)·저장 중 포커스 유지(A2)
status: done
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends:
priority: P1
updated: 2026-10-19
---

## 배경
TASK-EDITOR-01(review)에서 나눈 카드. 같은 브랜치에서 이어서 하며, EDITOR-01 병합 전이라 의존성 칸은 비운다.
[5개 역할 교차 검토 합의안](../reviews/2026-10-18-panel.md#합의안-총괄-정리-2026-10-18) 다음 주기 카드.

## 완료 조건
- [x] Field에 required/error/hint: 레이블에 '(필수)' 글자(흐린 작은 글씨), aria-invalid·aria-describedby 자동 연결, 실패 시 첫 오류 필드 포커스, 저장 버튼 비활성화 대신 오류 안내
- [x] hint 자리는 순찰 기본값 출처 안내와 공유
- [x] 저장 중 즉시 동작 컨트롤은 aria-disabled+가드로 포커스 유지, `[aria-disabled=true]`에 `button:disabled`와 같은 시각 스타일
- [x] `npm test`, `npm run test:desktop` 통과

## 범위 밖
머리 배치(TASK-EDITOR-01에서 완료).

## 진행 단계
- [x] 1. 검토 문서 A2·A3과 2·3차 조건 재확인(안전: 핸들러마다 busy 가드·저장 실패를 조용히 무시하지 않기 / 코드: 연속 동작 회귀 테스트, recurrence-smoke isDisabled 단언과 겹침)
- [x] 2. A3: Field required/hint/error, 앱 검증 오류(통제 종료일·반복 종료일·좌표·단속 건)를 필드에 연결하고 저장 버튼을 잠그지 않음, 실패 시 첫 오류 필드로 포커스
- [x] 3. A2: 즉시 동작 컨트롤(행 동작·달력 회차 완료/제외·사무소 탭·근무표 칸·메뉴)을 aria-disabled+가드로, 같은 시각 스타일. ListRow 동작 버튼 key를 순서로 바꿔 '처리 완료→미처리로 변경'처럼 이름이 바뀌어도 같은 버튼·포커스 유지
- [x] 4. desktop-list-smoke(키보드 토글 후 포커스 유지, 통제 종료일 오류 칸 연결·포커스·필수 표시), desktop-smoke(좌표 오류 시 저장 안 됨·오류 칸 이동·문구 연결), 한국어 기록

## 재개 위치
**완료**: 2026-10-19 사용자 승인으로 PR Recon987/AI-Coding#1(claude/zen-cannon-wc1at4)을 main에 병합(merge commit). 이전 메모: Codex 검증: src/ui.tsx `Field`(hint·error·필수 표시, aria-describedby/aria-invalid 병합)·`focusFirstInvalid`, src/components/{Controls,Calendar,Patrols,CoordinateInput,ListRow,Office}.tsx, src/main.tsx 메뉴, style.css `[aria-disabled="true"]`. 남은 한계: 브라우저 기본 required 말풍선은 그대로(noValidate 전환은 하지 않음), 홈 브리핑 화면의 완료 버튼 등 다른 즉시 동작은 disabled 유지. 실제 화면낭독기 확인은 기관 PC에서.

## 테스트 상태
Linux Node 22(2026-10-18): `npm test` 89/89, `npm run test:desktop` 8개 통과, 화면 검사 142·실패 0·외부 요청 0, 업무 흐름 11/11. Node 24·Windows Actions는 PR #1에서 확인.

## 검증 기록

### Codex 독립 검증 — 2026-10-18

Node24 기준9e2d719 전체89개·실제 앱·UI142·흐름11 및 Windows39105341497 성공 확인. EDITOR-01은16개 실제 배치 조합·Ctrl/MetaEnter·필수 입력 포커스·취소 보호 승인. EDITOR-02는 접힌 오류 포커스/CSV 지연 저장 중 탭 이동의 두 결함을 TASK-REVIEW-EDITOR-01에서 보완한 결과를 승인한다. **원본 단독과 보완본 판정을 구분**하며 보완 PR을 함께 통합한다. 새 회귀3개가 수정 전 실패·수정 후 통과했고 보완본 전체 검사도 통과했다. 보완 소스f97aaf3의 [Windows39105905136](https://github.com/Recon987/AI-Coding/actions/runs/39105905136)도 소스/패키지 모두 통과했다. [PR #5](https://github.com/Recon987/AI-Coding/pull/5) 보완과 함께 통합한다. [상세 검토](../reviews/2026-10-18-codex-editor.md).
