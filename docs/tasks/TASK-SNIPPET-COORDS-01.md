---
id: TASK-SNIPPET-COORDS-01
title: DD↔DMS Python 예제의 음수 1도 미만 좌표 부호 보존
status: backlog
role: builder
owner: none
verifier: codex
branch: task/task-snippet-coords-01
depends:
priority: P3
updated: 2026-10-20
---

## 배경
사후 검증 SNIP-01. shared/ax.mjs의 example-dd-dms를 Python으로 실행하면 -0.5 → (0, 30, 0.0) → +0.5가 된다. 앱은 예제를 실행하지 않지만 복사해 쓰는 예제가 남위·서경 0~1도에서 반구를 바꾼다. 앱 자체 좌표 입력 결함은 아니다.

## 완료 조건
- [ ] 예제의 부호/반구 표현을 명시해 -0.5·+0.5·-38.119444·+38.119444 왕복 보존
- [ ] 예제 설명·반환 계약·사용 예를 함께 갱신하고 경계(0·±90·±180·초/분 자리올림) 확인
- [ ] 기존 사용자 스니펫을 자동 덮어쓰지 않고 예제 변경 적용 범위를 명시
- [ ] 독립 감사의 SNIP-01과 관련 필수 검사 통과

## 범위 밖
앱 좌표 입력 재구현, 코드 자동 실행, 기존 저장 스니펫 자동 교체.

## 진행 단계
- [ ] 1. 표현 계약·예제 보완
- [ ] 2. 경계 검증·기록

## 재개 위치
사용자/총괄 착수 승인 대기. tests/postmerge-boundary-audit.cjs의 마지막 사례 및 docs/reviews/2026-10-20-codex-postmerge.md에서 재개한다.

## 테스트 상태
a70d9aa 독립 감사 SNIP-01 실패(원본 -0.5, 왕복 +0.5). 기존 npm test 161/161·전체 desktop 통과와 별도다.

## 검증 기록
2026-10-20 Codex가 가상 예제를 Python 3으로 추출 실행해 재현했다. 제품 코드는 미수정.
