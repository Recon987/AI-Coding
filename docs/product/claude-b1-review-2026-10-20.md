# B1 "기록을 바로 할 일로" 병렬 기술 검토·보안 인계 (Claude)

- **작성**: 2026-10-20, Claude. 과제 [TASK-REVIEW-HUB-B1-01](../tasks/TASK-REVIEW-HUB-B1-01.md).
- **검토 대상**: [통합안 b36307a](https://github.com/Recon987/AI-Coding/blob/b36307a/docs/product/hub-integrated-plan-2026-10-20.md) 3·5장(B1)과 요청 계약 5개.
- **기준 코드**:
  - `claude/zen-cannon-wc1at4` @ 270cf7a. main ea3105e에 SECURITY-01~03, HUB-ARCH-01이 더해진 상태다.
  - Codex B1 구현 브랜치는 원격에서 찾지 못했다. 그래서 구현 코드가 아니라 **계약과 현재 코드**를 대조했다.
- **하지 않은 것**: 제품 코드·Codex 브랜치·공용 제품 파일 수정.

## 1. SECURITY-02·03 현황과 B1이 따를 계약

### 상태

| 카드 | 최신 커밋 | 검사 | 병합 |
| --- | --- | --- | --- |
| SECURITY-01 설계 | 3b69fa9 외 | 문서 | review(Codex 설계 검토 대기) |
| SECURITY-02 저장 봉투·DPAPI·복구 키 | f976866 | Linux `npm test` 188/188(5개 시간대), `test:desktop` 종료 0, 화면 150·실패 0. Windows [39383034461](https://github.com/Recon987/AI-Coding/actions/runs/39383034461)(1bc848b) 성공, 패키징 앱이 실제 safeStorage 사용 | **main 미병합**, review |
| SECURITY-03 백업 암호 | 84c4685 | Linux `npm test` 196/196(3개 시간대), `test:desktop` 종료 0, 화면 150·실패 0, Codex 감사 3종 통과. Windows [39389450176](https://github.com/Recon987/AI-Coding/actions/runs/39389450176)(4bdae7c) 성공 | **main 미병합**, review |

- 세 카드 모두 Codex 독립 검증 전이다.
- 브랜치 HEAD 270cf7a는 이후 문서 커밋만 더해진 상태다(제품 코드 동일).

### 남은 결함·한계 (검증 때 볼 것)

1. **저장 암호화는 사용자가 켜야 한다.** 켜기 전에 만든 평문 사본(보호본·옛 백업)은 남는다. 정리는 SECURITY-04 범위다.
2. **패키징 앱으로 확인하지 못한 장면이 있다.** 다른 PC 보호기, 보호기 없음, 시작 복구 흐름의 암호 백업 창은 개발 실행에서만 검사했다.
   - 이유: 시험 보호기와 `-r` 스텁은 패키징 앱에서 쓸 수 없다.
   - 기관 실기기 검증도 아직 없다.
3. **다른 키로 봉한 주 파일로 시작할 때(`KEY_MISMATCH`)는 손상 복구 흐름으로 간다.** 바이트 사본을 남기고 last-good을 제안한다. 복구 키를 묻는 흐름은 아니다. 자료 손실은 없지만 안내가 최선은 아니다.
4. **백업은 항상 암호로 잠근다.** 암호 없는 백업 선택지는 없다. 사용자 확인 대기 중이다.
5. **Codex 감사 하나를 고쳤다.** `tests/desktop-nav-zones-audit.cjs`의 "미래 자료"를 `minReader: 3`에서 `READER_VERSION + 1`로 바꿨다. Codex의 확인이 필요하다.

### B1이 기준으로 삼을 계약 (SECURITY 브랜치 기준)

| 영역 | 계약 | 근거 |
| --- | --- | --- |
| 쓰기 | 자료 파일은 **`store.write()`로만** 쓴다. 봉함기가 켜져 있으면 주 파일·last-good·보호본·`.tmp`가 자동으로 봉투가 된다. `fs.writeFileSync`로 자료 JSON을 쓰지 않는다 | `desktop/store.cjs` `write`·`setSealer` |
| 읽기 | **`store.read()`로만** 읽는다. 봉한 파일을 키 없이 읽으면 `SEALED_LOCKED`, 다른 키면 `KEY_MISMATCH`, 변조면 `SEAL_TAMPERED`, 암호 백업이면 `BACKUP_PASSWORD_REQUIRED`. 테스트도 `JSON.parse(readFileSync(...))` 대신 `store.read`를 쓴다(암호화가 켜진 프로필에서 깨짐) | `parseStored` |
| 백업·복원 | 백업은 `store.writeBackup(file, data, password)`, 복원은 `store.readBackup(file, password?)`. IPC `backup(password)`→boolean, `restore()`→`{data}` / `{needsPassword,name}` / `null`. 이어서 `restore-password`·`restore-cancel`. 실제 앱 테스트는 `tests/backup-ui.cjs`의 `fillBackupPassword`·`fillRestorePassword`를 쓴다 | `desktop/main.cjs`, `src/types.ts` |
| 판독 수준 | `READER_VERSION = 3`은 **봉투 전용**이다. 내용의 `minReader`는 지금 최대 2(`readerNeeded`). 새 선택 컬렉션만 더하면 올리지 않는다. 기존 열거값을 넓히거나 의미를 바꿀 때는 **4**로 올린다(차단 2) | `shared/model.mjs:232` |
| 크기 | 20MB는 평문 기준이다. 봉한 파일은 `store.MAX_FILE_BYTES`(약 26.7MB)까지 읽는다. 크기 검사는 `fs.statSync().size > 20MB`가 아니라 `store.MAX_FILE_BYTES`로 한다 | `store.cjs`, `main.cjs` restore |
| 모르는 항목 | 모르는 최상위 항목은 보존한다(최대 100개, 64자). 새 컬렉션은 known 목록에 넣는 순간 검증 대상이 된다 | `shared/model.mjs:462` |
| 읽기 전용 | 새 쓰기 IPC는 `refuseWhenReadOnly()`를 먼저 부른다 | `main.cjs` |

**실측 확인(이번 검토)**: 아래 두 경로 모두 `workItems`(날짜형 due 객체 포함)와 끊긴 출처를 가진 `links`를 바이트 그대로 보존했다(일회성 node 확인, 저장소에 남기지 않음).
- 봉함기를 켠 `store.write` → `store.read`
- `store.writeBackup` → `store.readBackup`

## 2. 통합안 B1 검토 — 계약별 판정

| 요청 계약 | 판정 | 비고 |
| --- | --- | --- |
| 기존 인계·제출 유지 + 새 일반 작업 | **가능** | 저장은 분리하고 오늘 화면에서만 통합한다. `tasks` 검증(`patrolId` 엄격 참조, `done`↔`completedAt` 일치)을 그대로 둔다 |
| 메모/전화 하나에서 여러 후속 작업 | **가능** | `links`에 `followUp`(원본→작업)을 여러 줄 둔다. 기존 순찰→인계(`Task.patrolId`)와는 별개다. 중복 방지는 같은 (from,to,role) 한 줄만 막는다 |
| 작업 완료와 원본 전화 처리 독립 | **가능** | `Call.done`을 자동으로 바꾸지 않는다. 브리핑 "회신 대기"는 계속 `calls.done=false` 기준이다. 화면은 "후속 N개 중 M개 완료"를 파생 표시한다 |
| 기한 없음/날짜만/정확한 일시 | **차단 1** | 현재 파생 함수가 `Date.parse`·`new Date(at)` 기반이다 |
| 구판 보존·삭제된 출처·암호 저장/백업 | **조건부 가능(차단 2·3)** | 내용 보존은 확인했다. 판독 수준 충돌과 테스트 기준 어긋남이 막는다 |

## 3. 차단 문제 (3개)

### 차단 1 — 날짜만 있는 기한을 기존 시각 파생 함수에 넣으면 날짜가 밀리고 당일에 "경과"가 된다

- **근거**
  - `calendarItems`는 `dayKey(new Date(at))`로 날을 정한다(`shared/model.mjs:965`).
  - `reminderItems`·`desktop/store.cjs due()`는 `Date.parse(at)`를 쓴다(`model.mjs:998`).
  - `Date.parse("YYYY-MM-DD")`는 **UTC 자정**으로 해석된다(ECMAScript 날짜 전용 형식).
- **재현**(이번에 실행):
  ```
  TZ=America/New_York  due "2026-10-20" → dayKey(new Date(due)) = 2026-10-19
  TZ=Asia/Seoul / America/New_York 모두: 같은 날 현지 10:00에 Date.parse(due) < now → 경과로 판정
  ```
  날짜만 있는 작업이 서쪽 시간대에서는 전날 칸에 나타난다. 모든 시간대에서 마감일 당일 아침부터 "기한 지남"이 된다. 알림 경로에 넣으면 UTC 자정에 맞춘 시각으로 알림이 뜬다.
- **최소 수정안**(계약)
  1. 기한을 형식으로 구분한다. 예: `due: null | { kind: "date", date: "YYYY-MM-DD" } | { kind: "at", at: ISO일시 }`. 또는 상호배타 필드 `dueDate`/`dueAt`도 된다. 문자열 하나에 두 형식을 섞지 않는다.
  2. **날짜형**은 `shared/dates.mjs`의 날짜 키(`validDateKey`, `addDays`)로만 비교한다. 경과 = `dayKey(now) > date`. `new Date(date)`·`Date.parse(date)`를 금지한다.
  3. **날짜형은 알림 대상이 아니다**(통합안 "자동 자정 알림 없음"). `reminderItems`에는 `kind:"at"`만 넣는다. 달력은 날짜 키를 그대로 쓴다.
  4. 단위 검사: 서울·뉴욕·UTC·키리티마티·파고파고 5개 시간대에서 다음을 확인한다(기존 TZ-TEST 방식).
     - 날짜형: 당일은 경과 아님, 다음 날은 경과
     - 일시형: 정시 경계
     - 둘 다 달력 칸이 정확

### 차단 2 — 판독 수준 3이 두 의미로 갈라질 수 있다

- **근거**
  - SECURITY-02는 `READER_VERSION`을 3으로 올리고 그 값을 **봉투 전용**으로 정의했다(`shared/model.mjs:232` 주석, 봉투 `minReader:3`).
  - main(ea3105e)은 아직 2다.
  - B1이 main에서 출발해 내용 확장(예: 기존 `Task.kind`나 상태 열거값 확장)으로 수준을 3으로 올리면, 같은 숫자가 "봉투를 읽을 수 있음"과 "B1 내용을 읽을 수 있음"을 동시에 뜻하게 된다.
- **재현 조건**(가정 시나리오)
  1. B1 빌드(`READER_VERSION=3`, 봉투 코드 없음)가 SECURITY 빌드로 봉한 `{version:3,minReader:3,sealed}` 파일을 연다.
  2. `isNewerData`가 거짓이 되어 일반 자료로 정규화를 시도한다.
  3. 필수 컬렉션이 없어 "손상"으로 판정된다. 복구 흐름이 바이트 사본을 남기고 last-good(역시 봉투)을 제안하지만 실패한다.
  - 자료 삭제는 없지만, 정상 파일을 손상으로 안내하고 시작하지 못한다.
- **최소 수정안**
  - **수준 3은 봉투 전용으로 예약한다.**
  - B1이 새 선택 컬렉션만 더하면 수준을 올리지 않는다(모르는 항목 보존으로 충분).
  - 내용 의미를 넓히면 **4**를 쓰고, SECURITY 브랜치 위에서(또는 SECURITY가 main에 들어간 뒤) 올린다.
  - B1 카드에 "판독 수준 변경 없음(또는 4)"을 완료 조건으로 적는다.

### 차단 3 — B1 검사가 평문 백업·평문 파일을 전제하면 SECURITY 통합 즉시 실패한다

- **근거**
  - SECURITY-03 이후 앱의 백업은 항상 `{version:3,minReader:3,backupSealed:{…}}`이다.
  - "백업" 단추는 암호 시트를 먼저 연다.
  - `restore()` 반환형이 `Data`에서 `{data}|{needsPassword}|null`로 바뀌었다.
  - 기존 `tests/desktop-smoke.cjs`·`desktop-recurrence-smoke.cjs`도 이 이유로 갱신했다(SECURITY-03 d2fb096).
- **재현 조건**: main 기준 B1 smoke가 다음 둘 중 하나를 하면, SECURITY 병합 뒤 실패한다.
  - "백업" 클릭 후 `JSON.parse(readFileSync(backup)).workItems`를 검사한다 → 결과 `undefined`(첫 클릭은 시트를 열 뿐 파일이 없다).
  - 자료 파일을 `JSON.parse`로 직접 검사한다 → 암호화를 켠 프로필에서 실패한다.
  - B1이 `src/main.tsx` `backup()`이나 `main.cjs` restore 핸들러를 고치면 SECURITY-03 변경과 같은 함수에서 충돌한다.
- **최소 수정안**
  1. 병합 순서를 정한다: **SECURITY-01~03 검증·병합 → B1 브랜치에 main 병합**. 아니면 B1을 `claude/zen-cannon-wc1at4` 위에서 시작한다.
  2. B1 검사는 다음만 쓴다:
     - 자료 파일 읽기: `store.read`
     - 백업 확인: `store.readBackup(file, password)`와 `tests/backup-ui.cjs` 도우미
  3. B1은 backup/restore IPC와 `backup()` 렌더러 함수를 수정하지 않는다. 필요하면 SECURITY 통합 뒤 별도 커밋으로 한다.
  4. B1 완료 조건에 "봉함기 켠 프로필에서 새 컬렉션 저장·재시작·암호 백업·복원 왕복" smoke 1개를 넣는다(1장의 실측과 같은 경로).

## 4. 비차단 의견 (짧게)

- **끊긴 참조**: `links`의 끊긴 출처를 거부하지 말고 표시만 한다. `tasks.patrolId`처럼 엄격히 검증하면, 구판이 메모를 지운 파일을 새 앱이 "손상"으로 거부한다. 고아 링크 정리는 사용자가 확인한 뒤에만 한다.
- **링크 한도**: 1:N 후속과 근거 N:M으로 링크 수가 먼저 10,000건에 닿을 수 있다. 한도를 다르게 둘지 측정 뒤 정한다. 지금은 같은 10,000으로 시작하고 측정에 링크 비율을 명시한다.
- **ID 범위**: `Ref`는 (type,id) 쌍으로만 해석한다. 컬렉션마다 ID 공간이 다르다(같은 id 가능).
- **검색 이동**: `searchRecords`는 결과마다 `page`를 정한다. 새 작업·회의 화면 page ID를 `shared/applets.mjs`와 `tests/nav.cjs PAGE_IDS`에 함께 넣어야 이동이 끊기지 않는다.
- **알림 수신 기록**: `notification-receipts.json`은 id+at 기준이다. 작업 알림 id 접두어(`work:`)를 기존 `event:`·`task:`와 겹치지 않게 둔다.
- **완료 취소**: `completedAt`은 `done`과 일치를 강제한다(`tasks`와 같다). 완료 취소 시 null로 되돌리고, 기간 보고(B3)는 현재 `completedAt`만 본다는 한계를 표시한다.
- **출처 본문 복사**: 후속 작업 초안에 원문을 채울 때 길이 한도(본문 20,000자)를 넘으면 잘라서 채우고 알린다. 저장을 거부하지 않는다.

## 5. 확인 한계

- Codex의 B1 구현 코드는 보지 못했다(원격 브랜치 없음). 위 판정은 통합안 문구와 현재 코드 기준이다.
- 차단 2는 B1이 수준을 올리는 경우에만 생기는 조건부 문제다.
- 1장의 실측은 일회성 확인이며 저장소 검사로 추가하지 않았다(제품 파일 수정 금지). B1 카드의 smoke로 넣기를 권고한다.
