---
id: TASK-LIST-01
title: 공통 목록 행·필터 막대, 화면당 주 행동 하나
status: review
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends:
priority: P2
updated: 2026-10-16
---

## 배경
[디자인 V1·V2](../reviews/2026-10-16-design.md). 순찰 목록 행마다 진한 버튼, 문단형 목록.

## 완료 조건
- [x] 순찰·할 일·전화 목록이 같은 행 컴포넌트(열: 일시·상태·유형·제목·담당) — 업무 메모·탐방로 통제 포함 6개 화면. 날짜 없는 메모·전화는 상태·제목·번호 3열(compact)
- [x] 화면당 진한(primary) 버튼 1개 — 행 동작은 테두리/글자 버튼
- [x] 키보드로 행 이동·열기 — ↑/↓, Enter/Space
- [x] `npm test`, `npm run test:desktop` 통과

## 진행 메모
사용자 '이어서'(2026-10-16)로 다음 주기 착수. DESIGN-TOKENS-01과 같은 브랜치(PR Recon987/AI-Coding#1) 위라 의존을 풀고 함께 검증받는다.

## 범위 밖
자료 모델 변경.

## 진행 단계
- [x] 1. 설계: src/components/ListRow.tsx — 접힌 행 한 줄(일시·상태·유형·제목+부제·담당), 펼치면 상세. 행 동작은 모두 보조 스타일(진한 버튼은 화면의 '추가' 하나). ↑/↓ 행 이동, Enter/Space 펼치기(details 기본). 기존 선택자(.record, .record-details, 제목 h3) 유지. 적용: 순찰·인수인계·제출·전화메모·업무 메모·탐방로 통제
- [x] 2. 구현: src/components/ListRow.tsx(ListRow·ListHeader·rowKeys), Patrols·Tasks·Personal·Controls, style.css(5열 격자, 1100px 미만 2단)
- [x] 3. 테스트·문서: tests/desktop-list-smoke.cjs(test:desktop·Windows 패키지 단계), 캡처 docs/ui-review/cycle2/list-*.png

## 재개 위치
Codex 검증: ListRow 적용 6개 화면, 기존 버튼 이름 유지(테스트 호환), 960px 2단 배치, desktop-list-smoke. 화면 비교: docs/ui-review/cycle1/1280x800-patrol.png ↔ cycle2/list-patrol-1280.png.

## 테스트 상태
2026-10-16 Linux Node 22: TZ=UTC `npm test` 64/64, `npm run test:desktop` 통과(목록 스모크 포함), review:ui strict 134 통과·외부 요청 0, review:flows 10/10 수치 불변.

## 검증 기록


### Codex 검증 (2026-10-16)

기준73c938e 및 task/task-review-claude-01의 보완본 검토. 6화면 주행동1개·방향키/Enter·전문 접근 검증 승인. Node24 npm test70/70·전체test:desktop·UI142·업무흐름10/10 통과. 상세 재현/제약: [독립 검토 기록](../reviews/2026-10-16-codex-claude.md). main 미병합이므로 status는 review 유지.
