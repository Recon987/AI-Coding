---
id: TASK-HUB-B3B-01
title: B3b 정리·보고 화면과 내보내기
status: ready
role: builder
owner: none
verifier: claude
branch: task/task-hub-b3b-01
depends: TASK-HUB-B3A-01, TASK-HUB-B2B-01
priority: P1
updated: 2026-10-20
---

## 배경
구현은 Codex, 검증은 Claude가 맡는다(2026-10-20 승인). 문구 표준은 [명세](../product/claude-hub-schema-plan-2026-10-20.md) 6장 B3b다.

## 완료 조건
- [ ] 메뉴·화면 "정리·보고". 유형 탭: "주간 실적·계획" / "일일 브리핑" / "사업 추진보고" / "인수인계서"
- [ ] 주 행동: "클립보드 복사", "TXT 저장", "MD 저장"
  - 내보내기 IPC에서 renderer는 조건만 보내고 main이 다시 생성
  - "암호화되지 않은 파일" 안내
  - 원본 본문·경로 출력은 기본 끔
- [ ] 항목 포함·제외, 출처로 이동
- [ ] 핵심 흐름 종단 smoke, 조작 수 측정(`tests/task-flows.cjs`)
- [ ] `npm test`, `npm run test:desktop`, Windows Actions 통과

## 범위 밖
HWP·XLSX 생성, 문서 편집기.

## 진행 단계
- [ ] 1. 화면·유형 탭
- [ ] 2. 내보내기 IPC·종단 검사

## 재개 위치
B3a·B2b 병합 뒤 착수.

## 테스트 상태
미실행

## 검증 기록
