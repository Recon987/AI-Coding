---
id: TASK-AXDESK-01
title: AX Desk 권역별 사업 관리와 마일스톤 달력·브리핑 파생
status: review
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends: TASK-MODULES-02
priority: P2
updated: 2026-10-19
---

## 배경
TASK-ARCH-MODULAR-01 Step C-1. [보정 명세](../specs/modular-ax/implementation.md) 5장 '사업 관리'.

## 의존 예외
- 의존 예외: TASK-MODULES-02 (사용자 승인 2026-10-19, "이어서 AXDESK-01 진행해" — MODULES-02는 구현·Linux 검사 완료 후 Codex 검증 대기. 검증에서 바뀌는 점은 이 카드에도 반영)

## 완료 조건
- [x] 사업 등록·수정·삭제 확인·검색·권역(전체/본사/서부/북부/연구원·보전원/기타)·단계 필터·정렬
- [x] 집행률 막대: 총액 0은 "예산 미등록", 초과 집행은 수치와 경고(막대만 100%로 제한), 단계와 집행률을 섞지 않음, 금액 천원
- [x] nextMilestoneDate가 있는 사업은 달력·브리핑에 원본에서 정확히 1개 파생(events/tasks에 복제하지 않음), 수정·삭제·모듈 끔 정책 검사
- [x] `npm test`, `npm run test:desktop` 통과

## 범위 밖
스니펫(AXDESK-02), 보고서(AXDESK-03).

## 진행 단계
- [x] 1. 사업 목록·편집
- [x] 2. 마일스톤 파생·검사·기록

## 재개 위치
구현 완료, Codex 검증 대기. 검증 때 볼 곳: src/components/AxDesk.tsx(목록·편집·집행률), shared/ax.mjs(milestoneItems·milestoneTitle), shared/model.mjs(calendarItems·briefing의 AX 구역), shared/search.mjs(ax), tests/ax-desk.test.cjs, tests/desktop-axdesk-smoke.cjs. 다음 카드: TASK-AXDESK-02(스니펫 보관함).

## 구현 메모
- 목록: 권역 단추(전체·본사·서부·북부·연구원·보전원·기타, 건수, aria-pressed), 단계 선택, 정렬(마일스톤 가까운 순·최근 수정·사업명·집행률), 검색(사업명·권역·단계·담당·협력기관·마일스톤·위험·메모). 열: 마일스톤 날짜 / 단계 / 권역 / 사업명 / 담당. 마일스톤 정렬은 진행 중 사업을 날짜순(지난 날짜 먼저, '지남' 표시) → 날짜 없음 → 완료 사업 순.
- 집행: 사업비 0이면 "예산 미등록"(나누지 않음). 초과 집행은 "집행 113% (예산 초과)"와 "예산 초과 130천원" 표시, 막대만 100%에서 멈춤, 저장값은 입력 그대로. 단계 표시는 집행률과 따로. 금액 단위 천원, "공식 회계 자료가 아님" 안내.
- 편집: 사업명 필수, 금액 빈칸 = 0, 초과 집행은 저장을 막지 않는 경고(aria-invalid 아님). 삭제는 확인 후.
- 파생: `nextMilestoneDate`가 있는 사업마다 달력에 종일 항목 1개(분류 "AX", 보라색, 범례는 그 달에 AX 항목이 있을 때만). 홈의 날짜별 목록과 건수(AX n, 있을 때만), 브리핑 문구 "AX 사업 마일스톤 (n)"(그날 마일스톤이 있을 때만 구역 생성 — AX를 쓰지 않는 사무소의 브리핑은 그대로). events·tasks에 복제하지 않으므로 수정·삭제가 곧바로 반영된다. 완료 단계 사업의 마일스톤은 완료 표시.
- 모듈을 꺼도 마일스톤은 달력·브리핑에 남는다(명세 4장: 숨김 = 메뉴만). 달력에서 열면 숨김 안내와 함께 원본 편집 창이 열린다. 알림(reminder)은 추가하지 않았다(명세: 별도 결정 없이 알림 정책 추가 금지).

## 테스트 상태
2026-10-19 Linux(Node 22): `npm test` 147/147(새 ax-desk 5개), `npm run test:desktop` 14개 진입점(새 desktop-axdesk-smoke) + 감사 9/9, 화면 검사(확대 포함 strict) 150·실패 0·외부 요청 0, 업무 과업 11/11(클릭 수 MODULES-02와 같음). Windows는 푸시 후 수동 실행.

## 검증 기록
