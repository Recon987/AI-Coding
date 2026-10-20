---
id: TASK-MODULES-01
title: 모듈 레지스트리·선택 필드(modules·axProjects·axSnippets) 모델과 개편 전 백업(Step A)
status: done
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends:
priority: P2
updated: 2026-10-20
---

## 배경
TASK-ARCH-MODULAR-01 Step A. 기준 문서: [보정 명세](../specs/modular-ax/implementation.md) 3·4·6장. 사용자 원문은 [original.md](../specs/modular-ax/original.md).

## 완료 조건
- [x] `shared/applets.mjs`: 내장 모듈 레지스트리(AppletDefinition: id·name·icon(앱 Icon 이름)·description·category·defaultEnabled). 코어 4종(briefing·calendar·tasks·memos)은 끌 수 없음, 모듈 patrols·office·ax-desk
- [x] 선택 필드 `modules`({enabledModuleIds, moduleOrder, customConfigs}) 검증: 타입·중복·길이·개수·예약 키 거부, 모르는 ID·순서·설정은 보존(메뉴에서만 제외), customConfigs는 크기·깊이·키 제한 JSON
- [x] `axProjects`·`axSnippets` 검증(shared/ax.mjs): 필수 제목·ID 중복·허용 구분(권역·단계·분류)·길이·실제 날짜(nextMilestoneDate)·유한 0 이상 금액(천원), 각 10,000건
- [x] 필드가 없으면 메모리 기본값만 계산하고 단순 열람으로 파일을 다시 쓰지 않음. 기본 활성: 신규 설치 patrols·ax-desk, 조직·직원·근무 자료가 있는 기존 설치는 office도 켬
- [x] `modules`를 처음 저장하기 전 `workdesk.json.pre-modular-backup-<시각>.json` 보호본(실패 시 원본 불변, 복원 보호본 정리 대상 아님)
- [x] 단위 테스트 10건 이상(명세 6장 Step A ①~⑪), `npm test`·`npm run test:desktop` 통과

## 범위 밖
화면(MODULES-02), AX Desk 화면(AXDESK-01~03), 외부 플러그인 파일·원격 설치.

## 진행 단계
- [x] 1. 레지스트리·modules 검증·기본값
- [x] 2. AX 레코드 검증
- [x] 3. 개편 전 백업·테스트·기록

## 재개 위치
완료(2026-10-20 사용자 승인으로 main 병합). Codex 사후 독립 검증에서 결함이 나오면 새 카드로 처리한다.

## 구현 내용·검증 요점
- `shared/applets.mjs`(신규): CORE_APPLETS(briefing·calendar·tasks·memos, 기존 Page ID 매핑), MODULE_APPLETS(patrols·office·ax-desk), `visibleModules`(저장값이 없으면 메모리 기본값: 순찰·AX, 사무소 자료가 있으면 사무소도), `moduleOrder`, `withModules`(모르는 ID·순서·설정 보존), `validateModules`(ID 형식·중복·100개·예약 키·customConfigs JSON 64KB·깊이 6, 모르는 하위 키 보존). 화면 연결(componentKey)은 MODULES-02에서 src의 정적 맵으로.
- `shared/ax.mjs`(신규): 권역 hq·west·north·institute·other, 단계 planning·contract·execution·done, 스니펫 분류 gee·python·prompt·policy(화면에는 한글 라벨). 금액 천원, 0 이상 유한·1e9 이하, 초과 집행 허용, `nextMilestoneDate`(YYYY-MM-DD|null), 스니펫 본문 100,000자·태그 20개, `example: true` 표시, 각 10,000건. `executionRate`(예산 0이면 null, 초과는 1 초과 그대로).
- `shared/model.mjs`: axProjects·axSnippets를 선택 컬렉션(없으면 빈 목록), `modules`는 객체로 사용자가 바꾸기 전엔 쓰지 않음. 새 열거값은 새 컬렉션에만 있어 READER_VERSION 그대로(2).
- `desktop/store.cjs`: 실제 저장 파일에 처음으로 모듈형 항목(modules·axProjects·axSnippets)이 들어가는 저장 직전 `workdesk.json.pre-modular-backup-<시각>.json` 바이트 사본 1회(이름 충돌 회피, 실패 시 원본 불변, 복원 보호본 정리 대상 아님). v1/v2 전환은 기존 원본 백업만. 열기만으로는 쓰지 않음.
- 명세 ⑪(예제 재주입 방지)은 예제를 넣는 TASK-AXDESK-02에서 검사한다.

## 테스트 상태
2026-10-19 Linux(Node 22): `npm test` 142/142(새 modules 11개 + 허용값 스냅샷에 AX 3종), `npm run test:desktop` 12개 진입점 + 감사 9/9, 화면 검사 150·실패 0·외부 요청 0, 업무 과업 11/11. Windows 39261289803(c08591d, workflow_dispatch) 성공: 소스·설치본 실제 앱 검사 통과. main 1eb40aa(PR #13 병합) Windows 39261191057 성공.

## MOD-01 보완 (2026-10-19, Claude)
- `shared/applets.mjs`: `jsonBytes(value)`(TextEncoder로 JSON 텍스트의 UTF-8 바이트 수)를 추가하고 customConfigs 64KB 검사를 글자 수 대신 바이트로 바꿨다. 순수 함수, DOM·Electron 의존 없음.
- 경계 검사(tests/modules.test.cjs 새 2개): ASCII 정확히 65,536바이트 허용·1바이트 초과 거부, 한글 21,837자+ASCII 2바이트 = 정확히 65,536바이트 허용·1바이트 초과 거부, Codex 재현(한글 30,000자 = 90,023바이트) 거부.
- 이미 큰 설정이 든 파일: 시작 시 기존 손상 파일 흐름을 그대로 탄다 — 원본을 바이트 그대로 `.corrupt-<시각>.json`으로 보관, 안내창에 "모듈 설정은 64KB 이하여야 합니다" 원인 표시, 사용자가 고르기 전(종료 포함) 원본을 바꾸지 않음. 자동 삭제·축소 없음. 참고: modules를 쓰는 앱은 아직 main에 병합되지 않아 배포본 사용자의 파일에는 이 경우가 없다.
- 결과: `TZ=Asia/Seoul node tests/modular-contract-audit.cjs`의 MOD-01 사례 통과(AX-DATE-01 사례는 별도 P3 카드 TASK-AX-DATES-01로 아직 실패, 종료 코드 1 유지). `npm test` 149/149, `npm run test:desktop` 종료 0(17개 진입점). Windows 39288485908(79b0868, workflow_dispatch) 성공.

## 검증 기록

### 2026-10-19 Codex 독립 검증 — MOD-01 보완 요청
- 기준 e671160(실행 e6fd498), 원본 바이트 백업·백업 실패 원본 유지·미지 키 보존·minReader·기본 모듈·BK-01 보완은 통과.
- **MOD-01/P2**: customConfigs의 JSON.stringify(...).length는 바이트가 아니다. 한글 30,000자는 JSON 90,023 UTF-8 바이트인데 64KB 검사를 통과한다. 전체 20MB 저장 상한과 기존 자료 보존은 유지되므로 자료 손실로 과장하지 않는다. 카드에 명시한 설정 한도 계약은 아직 충족하지 못해 승인 보류, in-progress로 반환한다.
- 재현: `TZ=Asia/Seoul node tests/modular-contract-audit.cjs` 첫 사례 실패. 두 번째 AX 연도 사례는 별도 P3 후속이다. 검토·전체 증빙: [독립 검토](../reviews/2026-10-19-codex-modular.md).

### 2026-10-20 사용자 병합 승인 — Codex 사후 검증 예정
- 사용자: "main 병합 승인할게, 병합해". MOD-01 보완(79b0868)은 Codex 재검증 전. Codex는 나머지(자료 보존·백업·미지 키·minReader·기본 모듈)를 통과로 기록했다.
- 병합 전 Linux Node 22: `npm test` 161/161, `npm run test:desktop` 종료 0(진입점 17 + 감사 3), 화면 검사 150·실패 0, 업무 과업 11/11. Windows 최신 39297684401(7c2a067) 성공.
- 구현자(Claude)와 다른 검증자의 독립 승인 없이 병합한 것은 사용자 결정이다. Codex 사후 검증 결과는 이 카드 아래에 이어서 적는다.
