---
id: TASK-LIST-02
title: 목록 행 동작 위치·모양 통일(U2)
status: in-progress
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
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
- [x] 1. 검토 문서 U2와 2·3차 조건 재확인(접근성·현장: hover 전용 노출 반대 → 항상 표시, 상태 변경 동작은 강조 유지 / 코드: 테스트가 버튼 이름으로 찾음)
- [ ] 2. ListRow: 동작을 행 오른쪽 같은 줄로, 모양 규칙(상태 변경=테두리, 수정·보조=글자, 삭제=빨간 글자)
- [ ] 3. 업무 메모 상태 열 제거, 순찰 '이 기록으로 새 순찰'을 '새 순찰'로 축약(화면낭독기 이름은 전체)
- [ ] 4. 행 높이 72px 이하 검사·화면 확인·기록

## 재개 위치
2단계: src/components/ListRow.tsx(RowAction에 variant, 동작 위치), src/style.css(.list-row 그리드 2열·좁은 화면 아래로).

## 테스트 상태
미실행

## 검증 기록
