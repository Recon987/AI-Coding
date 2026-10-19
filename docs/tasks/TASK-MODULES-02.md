---
id: TASK-MODULES-02
title: 코어 4종·동적 모듈 메뉴·모듈 관리 서랍(Step B)
status: backlog
role: builder
owner: none
verifier: codex
branch: claude/zen-cannon-wc1at4
depends: TASK-MODULES-01
priority: P2
updated: 2026-10-19
---

## 배경
TASK-ARCH-MODULAR-01 Step B. [보정 명세](../specs/modular-ax/implementation.md) 4·6장.

## 완료 조건
- [ ] 사이드바: 코어 4종(업무 브리핑·월간 일정·인수인계·제출 기한·업무·전화 메모) 고정, 활성 모듈만 중단에 순서대로, 하단 모듈 관리·바로가기·앱 안내
- [ ] 인수인계↔제출 기한, 업무 메모↔전화메모, 순찰↔탐방로 통제는 화면 안 전환으로 접근. 기존 Page ID와 검색·브리핑·달력 링크 유지
- [ ] AppletDrawer(Sheet): 켜기/끄기, 위/아래 순서(키보드), 코어는 끌 수 없음 표시, 저장 실패·읽기 전용 처리
- [ ] 모듈 끄기 = 메뉴 숨김만(자료·알림·달력·브리핑 유지). 숨긴 모듈 기록을 검색·달력에서 열면 안내 후 열기. 현재 모듈을 끌 때 미저장 초안 보호
- [ ] 실제 앱 검사: 순찰 끄기→사라짐→켜기→복구, 순서 저장·재실행, 모두 꺼도 코어 사용, 링크 유지, 키보드·확대
- [ ] `npm test`, `npm run test:desktop` 통과

## 범위 밖
AX Desk 화면 내용.

## 진행 단계
- [ ] 1. 메뉴 구조·화면 안 전환
- [ ] 2. 모듈 관리 서랍
- [ ] 3. 숨김 모듈 링크·검사·기록

## 재개 위치
MODULES-01 완료 후.

## 테스트 상태
미실행

## 검증 기록
