---
id: TASK-SECURITY-05
title: 알림에 제목 숨기기(선택 기능)
status: ready
role: builder
owner: none
verifier: codex
branch: claude/zen-cannon-wc1at4
depends: 
priority: P3
updated: 2026-10-20
---

## 배경
[설계안](../research/security-01-design.md) 7장·10장: Windows 알림 센터에 일정·업무 제목이 남는다. 사용자 결정: 선택 기능으로 둠(기본은 지금처럼 제목 표시).

## 완료 조건
- [ ] 앱 안내(설정)에 "알림에 제목 숨기기" 켜기/끄기, 켜면 "일정 알림 1건"처럼 표시
- [ ] 설정은 desktop-settings.json(업무 자료 아님), 알림 중복 방지 규칙 유지
- [ ] `npm test`, `npm run test:desktop` 통과

## 범위 밖
내보내기·클립보드 암호화.

## 진행 단계
- [ ] 1. 설정·알림 문구·검사·기록

## 재개 위치
착수 전. 설계 승인(2026-10-20) 반영 카드.

## 테스트 상태
미실행

## 검증 기록
