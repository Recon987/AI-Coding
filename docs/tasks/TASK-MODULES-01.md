---
id: TASK-MODULES-01
title: 모듈 레지스트리·선택 필드(modules·axProjects·axSnippets) 모델과 개편 전 백업(Step A)
status: in-progress
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends:
priority: P2
updated: 2026-10-19
---

## 배경
TASK-ARCH-MODULAR-01 Step A. 기준 문서: [보정 명세](../specs/modular-ax/implementation.md) 3·4·6장. 사용자 원문은 [original.md](../specs/modular-ax/original.md).

## 완료 조건
- [ ] `shared/applets.mjs`: 내장 모듈 레지스트리(AppletDefinition: id·name·icon(앱 Icon 이름)·description·category·defaultEnabled). 코어 4종(briefing·calendar·tasks·memos)은 끌 수 없음, 모듈 patrols·office·ax-desk
- [ ] 선택 필드 `modules`({enabledModuleIds, moduleOrder, customConfigs}) 검증: 타입·중복·길이·개수·예약 키 거부, 모르는 ID·순서·설정은 보존(메뉴에서만 제외), customConfigs는 크기·깊이·키 제한 JSON
- [ ] `axProjects`·`axSnippets` 검증(shared/ax.mjs): 필수 제목·ID 중복·허용 구분(권역·단계·분류)·길이·실제 날짜(nextMilestoneDate)·유한 0 이상 금액(천원), 각 10,000건
- [ ] 필드가 없으면 메모리 기본값만 계산하고 단순 열람으로 파일을 다시 쓰지 않음. 기본 활성: 신규 설치 patrols·ax-desk, 조직·직원·근무 자료가 있는 기존 설치는 office도 켬
- [ ] `modules`를 처음 저장하기 전 `workdesk.json.pre-modular-backup-<시각>.json` 보호본(실패 시 원본 불변, 복원 보호본 정리 대상 아님)
- [ ] 단위 테스트 10건 이상(명세 6장 Step A ①~⑪), `npm test`·`npm run test:desktop` 통과

## 범위 밖
화면(MODULES-02), AX Desk 화면(AXDESK-01~03), 외부 플러그인 파일·원격 설치.

## 진행 단계
- [ ] 1. 레지스트리·modules 검증·기본값
- [ ] 2. AX 레코드 검증
- [ ] 3. 개편 전 백업·테스트·기록

## 재개 위치
1단계: shared/applets.mjs(레지스트리), shared/model.mjs normalize에 modules 연결·검증, src/types.ts, tests/modules.test.cjs.

## 테스트 상태
미실행

## 검증 기록
