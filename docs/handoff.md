# AI-Coding 작업 인계장 (`docs/handoff.md`)

**저장소**: `Recon987/AI-Coding` (병합 대상 `main`) · **검증 브랜치 앱/데이터 버전**: `0.8.0` / `v3` (`v1`/`v2` 자동 백업 후 전환, 기존 `v3` 무손실 호환)

이 문서는 **Codex·Gemini·Claude**가 `공원 업무 수첩 (Park Workdesk)` 작업을 주고받을 때 보는 저장소 전체 요약이다. **과제별 현재 상태는 `docs/tasks/<ID>.md` 카드가 유일한 원천**이며, `npm run board`로 현황판을 본다. 운영 절차는 [docs/orchestration/README.md](orchestration/README.md), 규칙은 [AGENTS.md](../AGENTS.md), 실행 증빙은 [docs/validation.md](validation.md), 아키텍처는 [docs/architecture.md](architecture.md)에 있다.

## 최신 Claude 인계 — 2026-10-20 범용 업무 허브 기술 설계(TASK-HUB-ARCH-01, review)

Codex 요청에 대한 설계·계획 응답이다: [claude-architecture-response-2026-10-20.md](product/claude-architecture-response-2026-10-20.md).
- 새 선택 컬렉션 `workItems`·`projects`·`meetings`·`resources`와 연결표 `links`를 둔다. 기존 레코드는 바꾸지 않고, `READER_VERSION`도 올리지 않는다.
- 모듈 계약을 정했다: 필드·보기·행동·기한·보고·버전.
- 첫 묶음 카드 초안 B1~B3(오늘의 업무 → 사업 공간 → 주간 실적·인계)을 만들었다. 카드 파일은 만들지 않았고 ready도 아니다.
- 기관 API는 main 어댑터 뒤에 둔다. 첫 단계는 읽기 전용 가상 어댑터다.
- 제품 코드는 바꾸지 않았다. SECURITY-02·03은 review 그대로다.

### [GEMINI_HANDOFF_PACKET]
- **Repository & Branch**: Recon987/AI-Coding. main = ea3105e. 작업 브랜치 `claude/zen-cannon-wc1at4`. 방향안은 `origin/task/task-product-direction-01`(f632273)
- **Task Card**: TASK-HUB-ARCH-01 review(검증자 codex). SECURITY-01·02·03 review 유지
- **Latest Pushed Commit**: 응답 패킷을 참조한다(이 문서를 포함한 커밋)
- **Completed Steps & Modified Files**: docs/product/claude-architecture-response-2026-10-20.md(신규), docs/tasks/TASK-HUB-ARCH-01.md(신규), 작업 기록 39장
- **Changed Interfaces / Schema Diff**: 없음(제안만)
- **Test Status**: `npm test` 196/196(문서·보드 검사)
- **Remaining Work for Gemini**:
  - Gemini: 세 화면·직무 시나리오
  - Codex: 두 응답 통합, 쟁점 3개 결정안
  - 사용자: 첫 묶음 승인
- **Modified Code Snippets (if uncommitted)**: 없음

## 최신 Claude 인계 — 2026-10-20 SECURITY-03 백업 암호 구현(review)

자료 관리 > 백업은 이제 그 백업에만 쓰는 암호를 두 번 받아 scrypt(N=2^17) → AES-256-GCM으로 잠근다. 암호는 저장하지 않는다.
- 복원: 암호 백업이면 암호를 묻는다. 틀리면 무변경이고 다시 입력할 수 있다. 평문 백업은 그대로 복원된다. 다른 PC에서도 암호만 있으면 열린다.
- 시작 복구 흐름에서 고른 암호 백업은 작은 창에서 암호를 받는다.

[카드](tasks/TASK-SECURITY-03.md) · [작업 기록 38장](work-log/2026-10-18-claude-2.md)

### [GEMINI_HANDOFF_PACKET]
- **Repository & Branch**: Recon987/AI-Coding. main = ea3105e. 작업 브랜치 `claude/zen-cannon-wc1at4` = main + SECURITY-01 설계 + SECURITY-02·03 구현
- **Task Card**: TASK-SECURITY-03 review(검증자 codex, 의존 예외 SECURITY-02). SECURITY-01·02도 review. Claude in-progress 없음
- **Latest Pushed Commit**: 4c4f521. Windows 39389450176(4bdae7c) 성공. 이 문서를 포함한 최종 해시는 응답 패킷을 참조한다
- **Completed Steps & Modified Files**:
  - 새 파일: `desktop/backup-seal.cjs`, `shared/backup-password.mjs`(+d.mts), `src/components/BackupSheet.tsx`
  - 수정: `desktop/store.cjs`(`readBackup`·`writeBackup`), `desktop/main.cjs`(backup·restore·restore-password·restore-cancel, `askSecret` 시작 창), `desktop/recovery.cjs`(`askBackupPassword`), `desktop/preload.cjs`, `src/components/Security.tsx`, `src/main.tsx`, `src/types.ts`
  - 검사: `tests/backup-seal.test.cjs`, `tests/desktop-backup-password-smoke.cjs`, `tests/backup-ui.cjs`(신규), `tests/recovery-dialog-stub.cjs`·`desktop-smoke`·`desktop-recurrence-smoke`(갱신)
- **Changed Interfaces / Schema Diff**:
  - 백업 봉투 `{version:3, minReader:3, backupSealed:{format, version:1, kdf:"scrypt", N, r, p, salt, alg, iv, tag, data}}`
  - IPC `backup(password)`→boolean, `restore()`→`{data}|{needsPassword,name}|null`, 새 `restore-password`·`restore-cancel`, `unlock-info`에 `kind`(recovery/backup)
  - 자료 스키마 불변
- **Test Status**:
  - Linux Node 22: `npm test` 196/196(시간대 3종), `test:desktop` 종료 0(PASS 22줄), 화면 150·실패 0, 과업·Codex 감사 3종 통과
  - Windows 39389450176 성공
  - 기관 실기기: 미확인
- **Remaining Work for Gemini**:
  - Codex: SECURITY-01 설계 검토, SECURITY-02·03 검증
  - 사용자: 백업을 항상 암호로 잠그는 방식 확인, main 병합 승인 여부
  - 다음 카드: SECURITY-04(켜기 전 평문 사본 정리·기본 켜기 여부·성능 실측), SECURITY-05(알림 제목 숨김)
- **Modified Code Snippets (if uncommitted)**: 없음

## 최신 Claude 인계 — 2026-10-20 SECURITY-02 저장 암호화 구현(review)

자료 관리 > **저장 암호화**를 추가했다. 사용자가 켜는 방식이다.
- 켜는 절차: 복구 키(4자리씩 6묶음)를 한 번 보여 주고, 다시 입력해야 켜진다.
- 켜면 주 파일·last-good·보호본·백업·`.tmp`를 AES-256-GCM 봉투(`minReader 3`)로 저장한다. 데이터 키는 DPAPI로 감싸 `workdesk.key.json`에 둔다.
- 이 PC가 키를 못 열면(계정·PC 변경, 키 파일 분실): 시작할 때 복구 키 창을 띄우고, 열기 전에는 자료를 읽거나 쓰지 않는다.
- 운영체제 키 보호가 없는 PC에서는 켜지 않고 이유를 보여 준다.

[카드](tasks/TASK-SECURITY-02.md) · [작업 기록 37장](work-log/2026-10-18-claude-2.md)

### [GEMINI_HANDOFF_PACKET]
- **Repository & Branch**: Recon987/AI-Coding. main = ea3105e. 작업 브랜치 `claude/zen-cannon-wc1at4` = main + 9주기 기록 + SECURITY-01 설계 + SECURITY-02 구현
- **Task Card**: TASK-SECURITY-02 review(검증자 codex). 의존 예외 SECURITY-01(설계 review, 사용자 승인). Claude in-progress 없음
- **Latest Pushed Commit**: 1bc848b(Windows 39383034461 성공). 이 문서를 포함한 최종 해시는 응답 패킷을 참조한다
- **Completed Steps & Modified Files**:
  - 새 파일: `desktop/seal.cjs`, `desktop/keystore.cjs`, `desktop/protector.cjs`, `src/components/Security.tsx`
  - 수정: `desktop/store.cjs`·`main.cjs`·`preload.cjs`, `shared/model.mjs`, `src/main.tsx`·`types.ts`·`Icon.tsx`·`style.css`
  - 검사: `tests/seal.test.cjs`·`store-sealed.test.cjs`·`desktop-security-smoke.cjs`(신규), `tests/desktop-nav-zones-audit.cjs`(미래 자료를 `READER_VERSION+1`로)
  - 설정·문서: `package.json`, `windows-build.yml`, `docs/architecture.md`
- **Changed Interfaces / Schema Diff**:
  - 자료 스키마 불변. 저장 봉투 `{version:3, minReader:3, sealed:{alg, keyId, iv, tag, data, recovery}}`
  - `READER_VERSION` 2 → 3(봉투 전용). 구버전 앱은 봉한 파일을 새 버전 자료로 보고 바꾸지 않는다
  - 새 파일 `workdesk.key.json`
  - 새 IPC: `security-status/prepare/cancel/enable`, `unlock-info/try/quit`
  - 개발 실행 전용 `PARK_TEST_PROTECTOR`(패키징 앱은 무시)
- **Test Status**:
  - Linux Node 22: `npm test` 188/188(시간대 5종), `test:desktop` 종료 0(진입점 19 + 감사), 화면 150·실패 0, 과업 11/11, Codex 감사 3종 통과
  - Windows 39383034461 성공: 패키징 앱 `desktop-security-smoke` "safeStorage 실제" 통과
  - 기관 실기기: 미확인
- **Remaining Work for Gemini**:
  - Codex: SECURITY-01 설계 검토, SECURITY-02 검증
  - 사용자: 기관 PC에서 켜기·재시작 확인, main 병합 승인 여부
  - 다음 카드: SECURITY-03(백업 암호·다른 PC 복원), SECURITY-04(켜기 전 평문 사본 정리·기본 켜기 여부)
- **Modified Code Snippets (if uncommitted)**: 없음

## 최신 Codex 인계 — 2026-10-20 PR16 병합 후 재검증

PR16은main ea3105e로이미병합됐고mainWindows39372610397도성공했다. **LOC-01·SNIP-01보완을Codex가독립재검증해모두해결승인**했다. [최종판정·새증빙](reviews/2026-10-20-codex-postmerge02.md). 아래이전반려/재검증예정표시는당시기록이다.

### [GEMINI_HANDOFF_PACKET]
- **Repository & Branch**: Recon987/AI-Coding. main = ea3105e. 작업 브랜치 claude/zen-cannon-wc1at4 = main + 9주기 기록 + Codex 재검증 기록 + SECURITY-01 설계
- **Task Card**: TASK-SECURITY-01 review(설계 카드, Codex 설계 검토 대기). 새 카드 ready: SECURITY-02(P1, 저장 봉투·DPAPI 키·복구 키) → SECURITY-03(P1, 백업 암호) → SECURITY-04(P1, 평문 전환·사본 정리·실측), SECURITY-05(P3, 알림 제목 숨김). Claude in-progress 없음
- **Latest Pushed Commit**: 3b69fa9(설계안) (이 문서를 포함한 최종 해시는 응답 패킷 참조)
- **Completed Steps & Modified Files**: docs/research/security-01-design.md(10장 사용자 결정 추가), docs/tasks/TASK-SECURITY-01.md(review)·TASK-SECURITY-02~05.md(신규), 작업 기록 36장
- **Changed Interfaces / Schema Diff**: 없음(제품 코드 변경 없음). 예정: 저장 봉투 `{version:3, minReader:3, sealed}`, `workdesk.key.json`
- **Test Status**: npm test 169/169. 설계 측정 scripts/security-bench.cjs(20MB 봉함 175ms·열기 15ms, scrypt N=2^17 427ms)
- **Remaining Work for Gemini**: Codex: SECURITY-01 설계 검토. 사용자: SECURITY-02 착수 승인(의존 SECURITY-01이 review라 의존 예외 필요), 기관 PC 사정 확인되면 알려 주기. Claude: SECURITY-02 구현
- **Modified Code Snippets (if uncommitted)**: 없음

## 이전 Codex·Claude 인계(보완 재검증 전)

원격 게시 승인을 받아 기존b3552b9를 먼저 푸시했고 Claude519b7cc의 세 카드를 추가 검증했다. **TZ-TEST-01·NAV-02 승인, LOCATION-01은LOC-01/P2 반려**다. 정상 미리보기 뒤 다른CSV가UTF-8/크기 오류로 거부되면 이전 적용 단추가 남아 낡은CSV를 저장할 수 있다. [최종 판정·증빙](reviews/2026-10-20-codex-dispatch.md). 이전 사후검증의MOD-01·AX-DATES-01·보고서 승인은 유지하고SNIP-01/P3는backlog다.

### [GEMINI_HANDOFF_PACKET]
- **Repository & Branch**: Recon987/AI-Coding. main = ea3105e(PR #16 병합). 작업 브랜치 claude/zen-cannon-wc1at4는 main 위에 이 기록 커밋만 추가
- **Task Card**: 9주기 카드 4장 done(TZ-TEST-01·NAV-02·LOCATION-01·SNIPPET-COORDS-01). LOC-01·SNIP-01 보완은 Codex 사후 재검증 예정. Claude in-progress 없음. backlog: SECURITY-01(P1)·LAW-01·LEDGER-01
- **Latest Pushed Commit**: ea3105e - Merge PR #16 (이 문서를 포함한 최종 해시는 응답 패킷 참조)
- **Completed Steps & Modified Files**: PR #16 병합, main Windows 확인 기록(docs/handoff.md)
- **Changed Interfaces / Schema Diff**: main 반영: 선택 컬렉션 `zones`, 화면 설정 localStorage `park-workdesk-last-page`, `appletOfPage`·`rememberPage`·`restorePage`, 예제 스니펫 반구 계약. IPC 변경 없음
- **Test Status**: Linux Node 22 npm test 169/169(시간대 5종), test:desktop 진입점 18 + 감사 9/9, 화면 150·실패 0, 업무 과업 11/11. Windows PR 39372195110·main 39372610397 성공
- **Remaining Work for Gemini**: Codex: LOC-01·SNIP-01 사후 재검증. 사용자: 다음 카드 승인(SECURITY-01 등), AX 주간 브리핑/알림·스니펫 예제 방식 결정, 실제 담당구역 번호표 반입 확인
- **Modified Code Snippets (if uncommitted)**: 없음
```markdown
### [GEMINI_HANDOFF_PACKET]
- **Repository & Branch**: Recon987/AI-Coding. main = a70d9aa. 작업 브랜치 claude/zen-cannon-wc1at4 = main + 8주기 기록 + TZ-TEST-01 + NAV-02 + LOCATION-01
- **Task Card**: TASK-LOCATION-01 review(검증자 codex, 사용자 승인 착수). TASK-NAV-02·TZ-TEST-01 review. 8주기 MOD-01 보완·AXDESK-02·03·AX-DATES-01 Codex 사후 검증 대기. Claude in-progress 없음
- **Latest Pushed Commit**: 82f3a59(LOCATION-01 구현, Windows 39358186950 성공) (이 문서를 포함한 최종 해시는 응답 패킷 참조)
- **Completed Steps & Modified Files**: shared/zones.mjs·zones-import.mjs(+d.mts, 신규), shared/model.mjs(선택 컬렉션 zones), src/types.ts(Zone), src/components/ZoneManager.tsx(신규)·Patrols.tsx(제안), src/main.tsx(자료 관리 메뉴), style.css, docs/architecture.md, tests/zones.test.cjs·desktop-zones-smoke.cjs(신규), package.json·windows-build.yml, 카드·작업 기록 33장
- **Changed Interfaces / Schema Diff**: 선택 최상위 컬렉션 `zones`({id, code, name, route, active}, 10,000건, 번호 고유). READER_VERSION 그대로(열거값 변경 없음, 구버전은 모르는 항목으로 보존). 순찰 `zone`은 자유 입력 유지. IPC 변경 없음
- **Test Status**: Linux Node 22: npm test 167/167(서울·뉴욕), npm run test:desktop 종료 0(진입점 18 + 감사 3), 화면 150·실패 0, 업무 과업 11/11. Windows 39358186950(82f3a59) 성공
- **Remaining Work for Gemini**: Codex: 환경 복구 → 사후 검증 4건 + TZ-TEST-01 + NAV-02 + LOCATION-01. 사용자: 실제 담당구역 번호표로 반입 확인, 다음 카드 승인(SECURITY-01 등), AX 주간 브리핑/알림·스니펫 예제 방식 결정
- **Modified Code Snippets (if uncommitted)**: 없음
```

## 2. 과제 현황

**2026-10-20 네 번째 main 병합(9주기)**: [PR #16](https://github.com/Recon987/AI-Coding/pull/16) → main ea3105e(merge commit). Windows PR 39372195110(649a204)·main push 39372610397(ea3105e) 성공. TZ-TEST-01(시간대 독립 검사)·NAV-02(도구별 마지막 화면 기억)·LOCATION-01(담당구역 번호 목록·순찰 입력 제안, LOC-01 보완)·SNIPPET-COORDS-01(좌표 예제 반구 보존)과 Codex 사후 검증 기록(REVIEW-POSTMERGE-01)을 사용자 승인으로 병합. 자료 형식 v3 유지(선택 컬렉션 `zones` 추가, 화면 설정 localStorage 키 1개). **LOC-01·SNIP-01 보완은 Codex 재검증 전**(카드 기록 참조).

**2026-10-20 세 번째 main 병합(8주기, 모듈형 개편)**: [PR #15](https://github.com/Recon987/AI-Coding/pull/15) → main a70d9aa(merge commit). Windows PR 39353328936(1623334)·main push 39353727584(a70d9aa) 성공. MODULES-01·02, AXDESK-01·02·03, AX-DATES-01과 묶음 카드 ARCH-MODULAR-01을 사용자 승인("main 병합 승인할게, 병합해")으로 병합. 기본 4종 + 켤 수 있는 모듈 메뉴(현장 순찰·사무소 현황·AX 사업 관리), 모듈 관리 서랍, AX 사업 관리(권역·단계·집행률·마일스톤 달력/브리핑 파생)·GIS·AI 스니펫·보고서 초안(새 IPC `export-ax-report`), 0001~0099년 날짜 보존. 자료 형식 v3 유지(선택 항목 `modules`·`axProjects`·`axSnippets`, 처음 저장 때 `.pre-modular-backup-<시각>.json`). **Codex 독립 검증은 MODULES-02·AXDESK-01 기능 승인까지만 받았고 MOD-01 보완·AXDESK-02·03·AX-DATES-01은 사후 검증 예정**(각 카드 검증 기록 참조).

**2026-10-19 모듈·AX 독립 검증**: [검토](reviews/2026-10-19-codex-modular.md). BK-01·HL-01 사후 재검증은 해결 승인이다. MODULES-02·AXDESK-01의 일반 업무 기능은 통과했으나 MODULES-01의 설정 64KB 바이트 계약(MOD-01/P2)을 보완해야 전체 병합을 승인할 수 있다. 낮은 연도 AX-DATE-01은 P3 후속. 아래의 과거 반려·검증 대기 문단은 당시 기록이다.

**2026-10-19 두 번째 main 병합**: 7주기 카드 6장(SCHEMA-01·BRIEF-02·LABELS-01·FORMS-02·HOLIDAY-01·BACKUP-02)과 Codex 자료 안전 감사(PR #10·#11)를 사용자 승인으로 병합. BK-01·HL-01 보완의 Codex 독립 재검증은 병합 뒤에 받는다. 다음 작업은 TASK-ARCH-MODULAR-01([보정 명세](specs/modular-ax/implementation.md)).

**2026-10-19 main 병합**: PR #1(검증 끝난 카드 29장)을 main에 병합했다. 사용자 결정 7건(Claude 추천 위임)은 [작업 기록 14장](work-log/2026-10-18-claude-2.md)과 각 카드에 있다. 아래 문단은 병합 전 기록이다.

`npm run board`가 우선순위·담당·재개 위치를 출력한다. 백로그를 중복 기록하지 않는다. 기존 EDITOR-01·02 보완은 Claude 원 브랜치에 통합됐다. 최신 DATES-01도 Codex가 독립 검증했고 월말 경계/Windows 검사 신뢰성을 PR #6에서 보완했다. 최종928e78e의 Windows39110892545 소스/패키지 각 PASS 확인. 최초39110532993은 중간 실패가 덮인 실행이므로 전체 통과 증빙에서 제외한다. main 병합 전 review 유지. 후속 CALENDAR-04는 Codex가 PR #7에서 구현·Linux/Windows 자동 검사를 마쳐 Claude 독립 검증 대기다.

## 3. 작업 시작·종료

[운영 절차 4~5장](orchestration/README.md#4-작업-순서-한-과제)을 따른다. 요약: `git fetch` → `npm run board` → 자기 `in-progress` 카드의 재개 위치부터 → 단계마다 체크포인트 푸시 → `review` → 다른 에이전트 검증 → 총괄이 `main` 병합.

## 보존한 Gemini TASK-CALENDAR-01

양력 법정/대체 및2025~2035 음력 공휴일, recurrence/repeatUntil 선택필드, holidaysForYear/holidayName/expandEventOccurrences/calendarItems(range)/reminderItems(now)/briefing 연계를 유지한다. 원본 하나에서회차를파생한다. 기존v3누락필드에임의기본값을쓰지않는다. 기준선 c32d590 npm test22/22·desktop통과. 검토에서발견한400회원본탐색상한은TRAY에서요청구간점프로수정하고장기일간/주간/월말/윤일회귀검증을추가했다.

## TASK-TRAY-01 완료 증빙

소스 50f7836, Windows [검증 실행](https://github.com/Recon987/AI-Coding/actions/runs/38827813053), [v0.6.0 다운로드](https://github.com/Recon987/AI-Coding/actions/runs/38827813053/artifacts/12015459007). 상세 범위·위젯 대역·Linux native Tray 미실행 및 Windows 실제 Tray 검사 구분은 validation.md 참조. 실기기 절차는 windows-checklist.md에 있다.

## TASK-UX-03 협의 기록

[세 분야 제안·협의·보완·교차 승인·전후 화면](review-rounds/TASK-UX-03.md). 현재 스키마·기존 자료와 트레이를 유지했다. 사용자 요청은 이번 개선 루프를 실행하는 것이며, 백그라운드 자동 개선 서비스를 추가하지 않았다.

Windows 검증 소스 `887ca68`, [실행 성공](https://github.com/Recon987/AI-Coding/actions/runs/38844487365), [v0.6.1 설치형·portable](https://github.com/Recon987/AI-Coding/actions/runs/38844487365/artifacts/12023060736). 패키징된 EXE도 새 첫 사용·날짜·달력 및 기존 트레이 회귀를 통과했다.

## TASK-CALENDAR-02 검증 브랜치

소스 `4a10c2c`, [PR #3](https://github.com/Recon987/AI-Coding/pull/3), [Windows 성공](https://github.com/Recon987/AI-Coding/actions/runs/38898226246), [v0.7.0 설치형·portable](https://github.com/Recon987/AI-Coding/actions/runs/38898226246/artifacts/12044503916). [모델 계약·독립 검토·실제 화면](reviews/2026-10-16-calendar02.md). 문서 증빙 후속 커밋은 실행 코드를 바꾸지 않는다.

## Claude 최신 개선 독립 검증

기준 ad40b18, [Windows 성공](https://github.com/Recon987/AI-Coding/actions/runs/39102593618), [최신 검증 설치형·portable](https://github.com/Recon987/AI-Coding/actions/runs/39102593618/artifacts/12127536294). [세 분야 검토·화면](reviews/2026-10-18-codex-panel.md), [한국어 작업 기록](work-log/2026-10-18-codex.md).

## 편집창·입력 오류 보완 검증

소스f97aaf3, [PR #5](https://github.com/Recon987/AI-Coding/pull/5), [Windows 성공](https://github.com/Recon987/AI-Coding/actions/runs/39105905136), [설치형·portable](https://github.com/Recon987/AI-Coding/actions/runs/39105905136/artifacts/12128711616). [세 분야 검토·오류 재현·화면](reviews/2026-10-18-codex-editor.md), [한국어 작업 기록](work-log/2026-10-18-codex-editor.md).

## DATES-01 최종 검증

소스928e78e, [PR #6](https://github.com/Recon987/AI-Coding/pull/6), [Windows 성공](https://github.com/Recon987/AI-Coding/actions/runs/39110892545), [설치형·portable](https://github.com/Recon987/AI-Coding/actions/runs/39110892545/artifacts/12129919918). [독립 검토·검사 신뢰성 보완](reviews/2026-10-18-codex-dates.md), [한국어 작업 기록](work-log/2026-10-18-codex-dates.md).

## CALENDAR-04 검증 요청

최종 소스86bd62c, [PR #7](https://github.com/Recon987/AI-Coding/pull/7), [Windows39128793988](https://github.com/Recon987/AI-Coding/actions/runs/39128793988), [v0.8.0 설치형·portable](https://github.com/Recon987/AI-Coding/actions/runs/39128793988/artifacts/12136379775). [초기 협의·직접 검사·전후 화면·독립 검증 상태](reviews/2026-10-18-codex-calendar04.md), [한국어 작업 기록](work-log/2026-10-18-codex-calendar04.md). Claude가 #7→#6→#1 순서로 검증·통합하며 main 병합 전 review를 유지한다.


## LIST-02 독립 검증·폭 경계 보완

[PR #9](https://github.com/Recon987/AI-Coding/pull/9), 실행 소스986910a, [Windows39185832387](https://github.com/Recon987/AI-Coding/actions/runs/39185832387) 성공, [시험 빌드](https://github.com/Recon987/AI-Coding/actions/runs/39185832387/artifacts/12157753983). 1101px 순찰 제목0px 결함을 보완했고1280px 행67px은 유지했다. [발견·검사·전후 화면](reviews/2026-10-19-codex-list02.md), [작업 기록](work-log/2026-10-19-codex-list02.md). Claude의 교차 검증 후 통합하며 main은 미병합이다.

## A11Y-02 복구·검증 결과 보존

환경 복구 후 기존 미푸시 변경을 별도 보관하고 Claude의 동등 수정·타이머 경합 보완을 검증했다. 추가 알림 재진입 포커스 문제는 [PR #8](https://github.com/Recon987/AI-Coding/pull/8) 실행746b478·최종 문서788071a에 보존했다. Linux 단위91·desktop10·UI150·흐름11, Windows39184848329 소스10/패키지9 모두 통과했다. 환경 오류로 검증 중단이라는 이전 기록을 대체한다. 이 LIST 브랜치는 PR #8을 포함하지 않으므로 총괄이 두 결과를 각각 통합한다.


## DS-01 재감사·후속6카드 독립 검증(2026-10-19)

DS-01은 afc3825에서 승인됐다. 자료 안전성 **감사 카드**는 사용자 요청대로done이다. 제품6카드는4승인·2반려로 전체 main 병합은 보류한다. [최종 검토](reviews/2026-10-19-codex-dispatch.md). BK-01은 시계 역행 때 새 복원 직전 보호본을 즉시 지우는 P1, HL-01은 공휴일 한도 초과 시 화면 안내 없는 미처리 예외 P2다. Claude가 BACKUP-02 진행 중 → HOLIDAY-01 ready 순으로 보완한다. 기존 자동 검사 성공은 이 새 경계 실패를 포함하지 않는다.
