---
id: TASK-AXDESK-02
title: AX Desk GIS·AI 스니펫 보관함
status: in-progress
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends: TASK-AXDESK-01
priority: P3
updated: 2026-10-19
---

## 배경
TASK-ARCH-MODULAR-01 Step C-2. [보정 명세](../specs/modular-ax/implementation.md) 5장 '스니펫 보관함'.

## 의존 예외
- 의존 예외: TASK-AXDESK-01 (사용자 승인 2026-10-19, "이어서 AXDESK-02 진행해" — AXDESK-01은 Codex 기능 승인 후 MODULES-01 재검증 대기로 review. 검증에서 바뀌는 점은 이 카드에도 반영)

## 완료 조건
- [ ] 분류(GEE/Python/프롬프트/법령·지침) 필터, 제목·태그·설명·본문 검색, 등록·수정·삭제
- [ ] 원클릭 복사(성공·실패 안내), 코드는 텍스트로만 표시(실행·HTML 삽입 없음), 한글·따옴표·개행·큰 본문 저장/복사 동일
- [ ] 예제 3개는 최초 초기화 때만, 고정 예제 ID·표시로 구분, 지운 뒤 다시 채우지 않음
- [ ] `npm test`, `npm run test:desktop` 통과

## 범위 밖
코드 실행, 외부 호출.

## 진행 단계
- [x] 1. 목록·검색·복사
- [ ] 2. 예제·검사·기록

## 재개 위치
2단계: 예제(shared/ax.mjs AX_EXAMPLE_SNIPPETS·withExampleSnippets, 빈 화면의 '예제 3개 넣기')는 코드 작성됨. 남은 일: tests/ax-desk.test.cjs에 예제·검색·왕복 검사, tests/desktop-snippets-smoke.cjs(복사 동일성·실패 안내·HTML 미해석·태그 오류·예제 재생성 없음·재실행), 전체 검사·기록.

## 테스트 상태
2026-10-19 체크포인트: tsc 통과, `npm test` 149/149(새 스니펫 검사 아직 없음), 화면 캡처로 빈 화면·목록·편집·768px 확인. test:desktop 미실행.

## 검증 기록
