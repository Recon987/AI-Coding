---
id: TASK-AXDESK-02
title: AX Desk GIS·AI 스니펫 보관함
status: backlog
role: builder
owner: none
verifier: codex
branch: claude/zen-cannon-wc1at4
depends: TASK-AXDESK-01
priority: P3
updated: 2026-10-19
---

## 배경
TASK-ARCH-MODULAR-01 Step C-2. [보정 명세](../specs/modular-ax/implementation.md) 5장 '스니펫 보관함'.

## 완료 조건
- [ ] 분류(GEE/Python/프롬프트/법령·지침) 필터, 제목·태그·설명·본문 검색, 등록·수정·삭제
- [ ] 원클릭 복사(성공·실패 안내), 코드는 텍스트로만 표시(실행·HTML 삽입 없음), 한글·따옴표·개행·큰 본문 저장/복사 동일
- [ ] 예제 3개는 최초 초기화 때만, 고정 예제 ID·표시로 구분, 지운 뒤 다시 채우지 않음
- [ ] `npm test`, `npm run test:desktop` 통과

## 범위 밖
코드 실행, 외부 호출.

## 진행 단계
- [ ] 1. 목록·검색·복사
- [ ] 2. 예제·검사·기록

## 재개 위치
AXDESK-01 완료 후.

## 테스트 상태
미실행

## 검증 기록
