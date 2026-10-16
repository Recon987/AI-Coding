---
id: TASK-CONTROL-01
title: 탐방로 통제 구간 기록과 브리핑 '오늘 통제'
status: ready
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends: 
priority: P1
updated: 2026-10-16
---

## 배경
[도메인 D3](../reviews/2026-10-16-domain.md), [UX T6](../reviews/2026-10-16-ux.md). 산불조심기간·기상특보 통제를 담을 곳이 없음.

## 완료 조건
- [ ] `controls` 컬렉션(구간·사유·시작·종료·근거 메모), 10,000건 한도·저장 검증
- [ ] 브리핑 화면·TXT에 오늘 유효한 통제, 달력에 기간 표시(원본에서 파생)
- [ ] T6 과업 완료
- [ ] `npm test`, `npm run test:desktop` 통과

## 범위 밖
외부 통제 정보 자동 수집.

## 진행 단계
- [ ] 1. 설계 메모(필드·화면)를 이 카드에 추가
- [ ] 2. 구현
- [ ] 3. 테스트·문서

## 재개 위치
착수 전.

## 테스트 상태
미실행

## 검증 기록
