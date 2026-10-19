---
id: TASK-SCHEMA-01
title: 앱 버전 혼용 보호: minReader 필드·알 수 없는 키 보존(S2)
status: review
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends:
priority: P1
updated: 2026-10-19
---

## 배경
[5개 역할 교차 검토 합의안](../reviews/2026-10-18-panel.md#합의안-총괄-정리-2026-10-18) 다음 주기 카드.

## 완료 조건
- [x] 사용자 승인: 최상위 선택 필드 minReader, 모르는 값이면 읽기 전용으로 열고 저장 거부
- [x] 알 수 없는 최상위 키 보존 여부 결정과 구현(보존, 이름 64자·100개 이하·`__proto__`/`constructor`/`prototype` 거부)
- [x] enum 확장(D4 고발·인계, D7 근무 구분)은 이 카드 이후(TASK-FORMS-02가 이 카드에 의존)
- [x] `npm test`, `npm run test:desktop` 통과

## 사용자 결정
2026-10-19 사용자가 결정을 Claude 추천에 위임("니가 추천하는 대로 그냥 진행"). 추천안 그대로 승인:
- 최상위 선택 필드 `minReader`(정수). 앱이 아는 기준보다 크면 읽기 전용으로 열고 저장을 거부하며 이유를 알린다. 없으면 지금처럼 정상(구버전 자료 호환).
- 알 수 없는 최상위 키는 **보존**한다(값 검증 없이 그대로 다시 쓰되 20MB 한도는 유지). 새 버전이 추가한 기록 종류가 구버전 저장으로 사라지지 않게 하기 위함.
- 이 카드 이후에 enum 확장(TASK-FORMS-02의 '고발·인계' 등)을 한다.

## 범위 밖
합의안의 보류·기각 항목.

## 진행 단계
- [x] 1. 검토 문서 S2와 2차 조건 재확인: 읽기 전용은 상단 저장 표시 자리에 글자 배지 + role="alert" 안내(UX·접근성 조건), 손상 처리와 구분(자료 안전)
- [x] 2. shared/model.mjs: `READER_VERSION`, `isNewerData`, `normalize(input, { allowNewer })`, 모르는 최상위 키 보존
- [x] 3. desktop: store.read `allowNewer`, recovery.openDataFile `"read-only"`·해석 불가 시 복구 흐름 없이 종료, main.cjs 저장·백업·복원 거부
- [x] 4. 화면: 읽기 전용 배지·안내, 저장/백업/복원 차단(편집 초안 유지)
- [x] 5. 테스트: tests/schema.test.cjs(8), tests/desktop-schema-smoke.cjs(소스·패키지 양쪽), 기록

## 재개 위치
구현 완료, Codex 검증 대기. 검증자는 아래 '검증 요점'을 대조한다.

## 구현 내용·검증 요점
- `shared/model.mjs`: `READER_VERSION = 1`. `minReader`는 1~1,000,000 정수만 허용, 있으면 그대로 보존(없으면 만들지 않음). `minReader > READER_VERSION`이면 기본 `normalize`는 code `NEWER_DATA`로 거부, `{ allowNewer: true }`는 나머지 검사를 통과할 때만 읽기 결과를 돌려준다(실패도 `NEWER_DATA`).
- 모르는 최상위 키: 값 검증 없이 보존(전체 20MB 한도는 그대로). 이전에는 "반입 메타데이터가 앱 상태가 되지 않게" 버렸으나, 앱은 이 키를 읽지 않으므로 상태가 되지 않고 손실만 막는다.
- `desktop/recovery.cjs`: 새 버전 파일은 손상 사본·변환·보호본 없이 `"read-only"`. 해석할 수 없는 새 버전 파일은 **복구 흐름(마지막 정상본 덮어쓰기)으로 가지 않고** 안내 후 종료 — 가장 큰 위험.
- `desktop/main.cjs`: 읽기 전용이면 save·backup·restore IPC 거부, 읽기 IPC(load·내보내기·알림)는 `allowNewer`. IPC 목록·preload 변경 없음.
- `src/main.tsx`: 상단 저장 표시 "읽기 전용"(`data-state="read-only"`), `role="alert"` 안내, 저장·백업·복원 시 오류 문구, 편집 초안은 닫지 않음.
- 한계: SCHEMA-01 이전 앱(v0.8.0 이하)은 `minReader`를 모르므로 보호되지 않는다. 다음 enum 확장(FORMS-02)부터 `READER_VERSION`을 2로 올리고 해당 자료에 `minReader: 2`를 쓴다.

## 테스트 상태
2026-10-19 Linux(Node 22): `npm test` 99/99(새 schema 8개), `npm run test:desktop` 11개 진입점 통과(새 desktop-schema-smoke: 새 버전 파일 바이트 불변·손상 사본/보호본 없음·UI/IPC 저장·백업·복원 거부, 현재 파일 UI 저장 후 모르는 키 보존), 화면 검사 150개 실패 0·외부 요청 0, 업무 과업 11/11. Windows는 푸시 후 확인.

## 검증 기록
