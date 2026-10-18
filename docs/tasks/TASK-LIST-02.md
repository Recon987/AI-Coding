---
id: TASK-LIST-02
title: 목록 행 동작 위치·모양 통일(U2)
status: backlog
role: builder
owner: none
verifier: claude
branch: task/task-list-02
depends:
priority: P2
updated: 2026-10-18
---

## 배경
[5개 역할 교차 검토 3차 재검토](../reviews/2026-10-18-panel.md#3차-구현-재검토-원-제안-역할)에서 UX가 누락을 지적한 U2.

## 완료 조건
- [ ] 행 동작 위치·클래스 통일(상태 변경=테두리, 수정=글자, 삭제=빨간 글자), 항상 표시
- [ ] 업무 메모의 무의미한 '메모' 상태 열 제거
- [ ] 메모·순찰 행 높이 1280x800에서 72px 이하
- [ ] 동작 4개 이상이면 펼침 영역 또는 축약('이 기록으로 새 순찰' 등)
- [ ] `npm test`, `npm run test:desktop` 통과

## 범위 밖
hover 전용 노출(기각).

## 진행 단계
- [ ] 1. 착수 시 검토 문서 U2와 2·3차 조건을 다시 읽고 단계를 나눈다

## 재개 위치
착수 전.

## 테스트 상태
미실행

## 검증 기록
