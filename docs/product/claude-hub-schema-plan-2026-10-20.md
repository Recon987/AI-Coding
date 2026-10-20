# 업무 허브 v3 확장 스키마·모듈 계약·B2/B3 분할안 (Gemini 지시 반영)

- **작성**: 2026-10-20, Claude. 과제 [TASK-HUB-SCHEMA-01](../tasks/TASK-HUB-SCHEMA-01.md).
- **입력**:
  - 사용자가 전달한 "[GEMINI → CLAUDE: B1~B3 데이터 모델·모듈 계약·개발 계획 정렬 지시]"
  - [통합안 b36307a](https://github.com/Recon987/AI-Coding/blob/b36307a/docs/product/hub-integrated-plan-2026-10-20.md)
  - [B1 검토 1c4caaa](claude-b1-review-2026-10-20.md)
- **기준 코드**: `claude/zen-cannon-wc1at4` = main ea3105e + SECURITY-02·03(review).
- **상태**: 명세 제안이다. 제품 코드는 바꾸지 않았고, 카드 파일과 ready 확정도 없다. Codex B1 구현 코드는 원격에 없어 보지 못했다.

## 0. Gemini 지시 반영 요약

| Gemini 지시 | 반영 | 조정한 점과 근거 |
| --- | --- | --- |
| 사업 이원화 금지, 범용 사업 구조(분야 `facility\|resource\|ax\|admin\|general`) | **반영**. 한 ID 공간, 한 사업 형태(`ProjectView`), 외래키 검증 1회 | AX 사업은 기존 `axProjects`에 **그대로 저장**한다. 옮기면 구판 AX 화면에서 사업이 사라져 무손실이 깨진다(1.3) |
| AX 모듈을 꺼도 사업·작업 연결 동작, 켜면 권역·예산(천원) 확장 표시 | **반영** | 모듈 계약 `fields.project`(3장) |
| 메모·전화 → 후속 작업 1:N, 순찰 1:1 재열기 유지 | **반영** | 후속 작업에 `source` 필드를 둔다. 순찰은 기존 `Task.patrolId` 규칙 그대로 |
| 원본 삭제 시 작업 본문 보존, "출처: 삭제된 메모/전화메모" | **반영** | `source`에 종류를 남긴다. 참조 정리는 하지 않는다 |
| 근거 자료 전역 보관함 + N:M `referenceIds[]` | **반영** | 새 전역 `references` 하나에 폴더·스니펫·공문번호·파일을 모두 담는다. `referenceIds`는 이 컬렉션 ID만 가리킨다(ID 공간 1개) |
| `tasks`에 새 구분값이 들어가면 `minReader: 3`으로 상향 | **조정**: 상향이 필요하면 **4** | 수준 3은 SECURITY-02 봉투가 이미 쓴다(`shared/model.mjs:232`). 3을 다시 쓰면 봉투를 읽지 못하는 앱이 봉투를 일반 자료로 오판한다([B1 검토 차단 2](claude-b1-review-2026-10-20.md)) |
| 기한 없음/날짜만/일시 3가지, 임의 시각 주입 금지 | **반영** | 2.4 기한 계약(B1 검토 차단 1의 수정안) |
| 상태 비전파(`call.done` 불변) | **반영** | 2.5 |
| 라벨: 작업/완료, 인수인계/조치 완료, 제출/제출 완료 | **반영** | 2.6 |

**일반 작업의 저장 위치**: 통합안(b36307a)대로 새 `workItems` 컬렉션을 권고한다.
- Gemini 문구 "후속 작업(`tasks`)"은 화면에서 한 종류로 보이는 것으로 해석했다.
- `tasks.kind`에 새 값을 넣는 쪽을 택하면 1.4의 규칙(수준 4, 구판은 열지 않음)을 따른다. Codex B1이 어느 쪽인지 확인이 필요하다(쟁점 1).

## 1. v3 확장 스키마 명세

자료 형식은 `version: 3`을 유지한다. 아래 "선택"은 필드가 없는 기존 파일도 그대로 열린다는 뜻이다.

### 1.1 구판(v0.8.0, reader 2)이 새 필드를 어떻게 다루는지 — 코드로 확인

| 대상 | 구판 동작 | 근거 |
| --- | --- | --- |
| 모르는 **최상위** 항목 | 보존(100개·64자 한도) | `shared/model.mjs:459–471` |
| 기존 레코드의 모르는 **필드** | 정규화는 레코드를 다시 만들지 않고 그대로 반환한다. 편집기는 기존 레코드를 펼쳐(`...draft`, `...p`) 저장하므로 유지된다 | `model.mjs:472–476`, `src/components/Tasks.tsx:30–55`, `AxDesk.tsx:88–143`, `Personal.tsx:31–44` |
| 기존 필드의 **새 열거값·형식** (예: `tasks.kind:"work"`, `at:null`) | 검증 실패. `minReader`가 없으면 손상으로 처리, 있으면 "새 버전 자료"로 열지 않음 | `model.mjs:430–448`, `isNewerData` |
| 구판이 **새로 만든** 레코드 | 새 선택 필드가 없다(=null로 해석) | — |
| 구판이 **지운** 원본 | 새 필드·컬렉션의 참조가 끊긴다 | 2.3 끊긴 참조 규칙 |

**실측(2026-10-20)**: `origin/main`(ea3105e)의 `shared/*.mjs`로 `normalize`를 일회성 실행해 확인했다.
- 보존됨: `tasks[].projectId`·`referenceIds`, `axProjects[].referenceIds`, 최상위 `workItems`·`references`. `minReader`는 붙지 않았다.
- `tasks.kind:"work"` → "업무 구분과 담당자를 확인하세요." 오류(손상 처리).
- 같은 자료에 `minReader:4`를 붙이면 → `NEWER_DATA`(열지 않고 바꾸지 않음).

**미지 필드 보존 규칙(새 판에도 유지)**:
1. 검증 함수는 레코드를 다시 만들지 않는다.
2. 편집기는 기존 레코드를 펼쳐 저장한다.
3. B1에 "구판이 모르는 레코드 필드를 저장 후에도 유지" 단위 검사를 추가한다(지금은 관례일 뿐 검사가 없다).

### 1.2 컬렉션별 명세

| 컬렉션 | 변경 | 필드(새 것만) | 검증 |
| --- | --- | --- | --- |
| `tasks`(인수인계·제출) | 선택 필드 추가 | `projectId?: string \| null`, `referenceIds?: string[]` | `projectId`는 1.3 사업 ID 집합에 있거나 null. `referenceIds`는 `references` ID, 최대 50개, 중복 없음. `kind`·`at`·`patrolId` 규칙은 **불변** |
| `workItems`(일반 작업) **신규** | 선택 컬렉션 | `id, title, body, status: "todo"\|"doing"\|"waiting"\|"done", due: Due, projectId: string\|null, source: Source\|null, referenceIds: string[], owner, priority: "normal"\|"high", createdAt, updatedAt, completedAt: string\|null` | 제목 필수(200자), 본문 20,000자. `done`이면 `completedAt` 필수, 아니면 null. 10,000건 |
| `notes`·`calls` | **불변** | — | 출처로만 쓰인다. 처리 상태(`calls.done`)도 독립 |
| `projects`(일반 사업) **신규** | 선택 컬렉션 | `id, title, field: "facility"\|"resource"\|"admin"\|"general", stage: "planning"\|"progress"\|"hold"\|"done", manager, nextMilestone, nextMilestoneDate: string\|null, risks, notes, referenceIds: string[], updatedAt` | AX와 같은 이름의 공통 필드(`title·stage·manager·nextMilestone·nextMilestoneDate·risks·notes·updatedAt`). `field:"ax"`는 여기 저장하지 않는다(1.3). 10,000건 |
| `axProjects` | 선택 필드 추가 | `referenceIds?: string[]` | 기존 AX 검증 그대로(권역·단계·예산 천원) |
| `references`(근거 보관함) **신규** | 선택 컬렉션 | `id, title, kind: "folder"\|"snippet"\|"file"\|"docNo"\|"text", targetId: string\|null, path: string\|null, docNo: string\|null, note, addedAt` | 종류별 필수 값은 다음과 같다. 경로는 실행하지 않고 위치 보기만 한다(AGENTS 원칙 2). 10,000건<br>• `folder` → `targetId`(기존 `folders` ID)<br>• `snippet` → `targetId`(`axSnippets` ID)<br>• `file` → `path`(절대 경로 4096자)<br>• `docNo` → `docNo`(100자) |
| `folders`·`axSnippets` | **불변** | — | 복사·이관하지 않는다. `references`가 `targetId`로 가리킨다 |

```ts
type Due = null | { kind: "date"; date: string /* YYYY-MM-DD */ } | { kind: "at"; at: string /* ISO 일시 */ };
type Source = { type: "note" | "call" | "patrol" | "meeting"; id: string; title: string /* 만들 때 출처 제목 사본 */ };
```

- `Source.title`은 출처가 지워진 뒤에도 "출처: 삭제된 전화메모 — <제목>"을 보여 주려는 사본이다. 출처 본문은 복사하지 않는다. 작업 본문은 만들 때 사용자가 확인한 초안이다.
- 회의(`meetings`)는 B1 범위 밖이다. B2에서 다음 형태로 넣는다:
  ```ts
  { id, title, at, attendees, body,
    projectIds: string[],                // 통합안: 여러 사업에 걸침
    decisions: { id, text }[],
    referenceIds: string[] }
  ```

### 1.3 사업 — 한 ID 공간, 저장은 둘 (무손실)

- **ID 공간**: `projects[].id`와 `axProjects[].id`는 서로 겹치면 안 된다(정규화가 검사).
  - 사업 외래키(`workItems.projectId`, `tasks.projectId`, `meetings.projectIds`)는 **합집합 하나**에서 검증한다. 이원화된 검증은 없다.
- **보기**: `listProjects(data)`(순수 함수)가 두 저장소를 한 형태 `ProjectView`로 돌려준다.
  ```ts
  { id, title, field, stage, manager, nextMilestone, nextMilestoneDate, risks, notes,
    referenceIds, updatedAt, ext?: { ax: { zone, budgetTotal, budgetExecuted, partner, axStage } } }
  ```
  - `axProjects` 행은 `field: "ax"`가 된다.
  - 단계는 이 표대로 일반 단계에 대응시켜 **표시만** 한다(원본 AX 단계는 바꾸지 않음):

    | AX 단계 | 일반 단계 |
    | --- | --- |
    | planning | planning |
    | contract, execution | progress |
    | done | done |
- **분야 "AX"로 사업 만들기**: `axProjects`에 저장한다(기본 권역 `hq`, 예산 0). 그래야 구판·AX 화면이 그 사업을 본다.
  - 일반 사업을 AX로 바꾸거나 그 반대로 바꾸는 일은 B2 범위 밖이다. 하려면 저장소 사이 이동과 원본 백업이 필요하다.
- **AX 모듈을 껐을 때**: 사업 공간은 AX 사업도 일반 필드로 보여 주고, 작업 연결은 계속된다. 확장 필드(권역·예산·집행률)만 숨긴다.
- **나중에 하나로 합칠 때**: `axProjects`를 `projects`로 옮기려면 원본 자동 백업과 수준 4가 필요하다. 구판 AX 화면이 사업을 잃기 때문이다. 이번 묶음에서는 하지 않는다.

### 1.4 `minReader`·`READER_VERSION` 규칙

| 변경 | 판독 수준 | 구판에서 일어나는 일 |
| --- | --- | --- |
| 새 선택 컬렉션(`workItems`·`projects`·`references`·`meetings`) | **올리지 않음** | 보존되고, 구판은 모른 채 동작한다 |
| 기존 레코드의 새 선택 필드(`projectId`·`referenceIds`) | **올리지 않음** | 보존된다(1.1). 구판이 새로 만든 레코드는 이 필드가 없다 |
| 저장 봉투(SECURITY-02) | **3 — 봉투 전용 예약** | reader 2 앱은 열지 않고 바꾸지도 않는다 |
| 기존 열거값 확장·형식 완화(`tasks.kind:"work"`, `tasks.at:null`, 새 `PatrolKind` 등) | **4**(SECURITY 병합 뒤 기준) | `readerNeeded()`가 4를 돌려주는 자료만 `minReader:4`. 구판(2·3)은 "새 버전 자료"로 열지 않는다(읽기 전용이 아니라 시작 중단, `recovery.cjs`). 그래서 B1은 새 컬렉션 방식을 권고한다 |

`readerNeeded()`는 지금처럼 **실제로 그 값을 쓴 자료만** 올린다. 다시 낮추지 않는다(`model.mjs:469`).

### 1.5 저장·백업 호환

- 새 컬렉션과 필드는 v3 내용 안에 있다. 그래서 봉투(`sealed`)와 백업(`backupSealed`)이 그대로 감싼다.
  - B1 검토에서 봉함 저장과 암호 백업을 일회성으로 왕복해 확인했다.
- 크기 한도는 평문 20MB와 종류별 10,000건이다. 봉한 파일은 `store.MAX_FILE_BYTES`를 따른다.
- 자료 파일은 `store.read`/`store.write`, 백업은 `store.readBackup`/`writeBackup`으로만 다룬다.

## 2. B1 데이터·상태 불변 조건

1. **사업·기한 무강제**
   - `workItems`는 제목 하나로 저장된다(`due: null`, `projectId: null`, `source: null`, `referenceIds: []`).
2. **1:N 출처**
   - 같은 `source.(type,id)`를 가진 작업이 여러 개 있어도 된다.
   - 순찰은 기존 계약을 유지한다: `tasks.patrolId` 미완료 1건과 "인계 다시 열기"는 `src/components/Patrols.tsx:150·238`이 그대로 지킨다.
   - 순찰에서 일반 작업을 만드는 것(`source.type:"patrol"`)은 이 1:1 규칙과 별개다.
3. **끊긴 참조**
   - `source`·`projectId`·`referenceIds`가 없는 대상을 가리켜도 정규화는 **거부하지 않는다**. 구판이 원본을 지울 수 있기 때문이다.
   - 화면은 이렇게 보여 준다:
     - 출처가 없음: "출처: 삭제된 {메모|전화메모|순찰 기록|회의} — {source.title}"
     - 사업이 없음: "사업 없음(삭제됨)"
     - 근거가 없음: "삭제된 자료"
   - 새 판에서 원본을 지울 때는 참조를 자동으로 고치지 않는다. 확인창에 "후속 작업 n건은 남고 출처가 '삭제됨'으로 표시됩니다"라고 알린다.
4. **기한 계약**(`Due`)
   - **날짜형**은 `shared/dates.mjs` 날짜 키로만 비교한다.
     - 경과 = `dayKey(now) > date`.
     - 달력 칸은 `date`를 그대로 쓴다.
     - 알림은 없다.
     - `new Date(date)`·`Date.parse(date)`는 쓰지 않는다.
   - **일시형**만 `reminderItems`에 들어간다(id 접두어 `work:`).
   - 기한이 없으면 오늘 목록의 "기한 없음" 묶음에만 보인다.
   - 시간대 5종 검사를 붙인다.
5. **상태 비전파**
   - 작업을 완료해도 `calls.done`·`tasks.done`·사업 단계는 바뀌지 않는다.
   - 출처 쪽에 "후속 N개 중 M개 완료"를 파생 표시한다.
   - 완료를 취소하면 `completedAt = null`.
6. **라벨**(`shared/labels.mjs`에 추가할 상수 — Codex B1이 넣는다)

   | 종류 | 구분 표기 | 완료 단추 | 완료 취소 |
   | --- | --- | --- | --- |
   | 일반 작업 | 작업 | 완료 | 다시 진행 |
   | 인수인계 | 인수인계 | 조치 완료 | 다시 진행 |
   | 제출 기한 | 제출 | 제출 완료 | 다시 진행 |

   기존 편집기 제목(`TARGET.submission = "제출 기한"`)은 유지하고, 목록·오늘 화면의 구분 표기만 "제출"로 쓴다(`tests/labels.test.cjs` 스냅샷 갱신).

## 3. 모듈 계약 (B2에서 1판 도입)

[기술 설계 3장](claude-architecture-response-2026-10-20.md#3-전문-모듈-계약)의 `ModuleContract`를 다음과 같이 고친다.

- **`fields.project(view) → FieldValue[]`**: AX가 `ext.ax`를 표시한다.
  - 권역, 사업비·집행액은 "천원" 단위, 집행률은 `budgetExecuted / budgetTotal`이며 사업비가 0이면 "—"이다.
  - 모듈을 끄면 호출하지 않는다.
- **`deadlines(data, range)`**: AX 마일스톤(`nextMilestoneDate`, 날짜형).
  - 지금 `briefing`에 박혀 있는 AX 마일스톤 절을 이 계약으로 옮긴다. 출력이 같은지 검사한다.
- **`rollup(data, period) → RollupSection[]`**: B3의 보고 기여다(4.3).
  - 원본 Ref를 반드시 가진다.
  - 이력이 없는 값(집행률 변화 등)은 만들지 않는다.
- **순찰 모듈**: `actions`에 "후속 작업 만들기"(`source.type:"patrol"`)를 둔다. `rollup`은 기간 순찰 건수와 주의·긴급 건이며, 개인정보·금액은 넣지 않는다.

## 4. B2·B3 카드 분할안과 역할

**전제**: B1(Codex)이 `workItems`와 기한 계약을 main에 넣은 뒤 시작한다. SECURITY-01~03은 B2 착수 전에 main 병합을 권고한다(B1 검토 차단 3). 카드 파일과 ready 확정은 사용자 승인 뒤에 한다.

| 카드(초안) | 사용자 결과 | 범위 | 완료 조건(요약) | 의존 | 구현 | 검증 |
| --- | --- | --- | --- | --- | --- | --- |
| **B2a 사업 모델·근거 보관함 자료** | (화면 없음) 사업·근거를 저장하고 검증한다 | 새 `projects`·`references`, `tasks`/`axProjects`·`workItems`의 `projectId`·`referenceIds`, ID 공간 합집합 검증, 순수 함수 `listProjects`, 끊긴 참조 표시 함수 | 구판 보존 행렬(1.1). 봉함·암호 백업 왕복. ID 충돌 거부. 끊긴 참조 비거부. 10,000건 측정(작업·근거·사업 혼합) | B1 | **Claude** | Codex |
| **B2b 사업 공간 화면** | 사업을 만들고, 한 화면에서 작업·근거·AX 확장 필드를 본다. 근거를 여러 사업·작업에 붙인다 | 사업 목록·개요·작업·근거 탭. 근거 선택·위치 보기 IPC(`shell.showItemInFolder`, 실행 없음). 모듈 계약 1판, AX `fields`·`deadlines` 이관 | AX 이관 전후 브리핑 출력 동일. AX 모듈 끔/켬 시 작업 연결 유지. 사업 삭제 시 원본 보존(확인창). 파일 없음 표시 | B2a | **Codex** | Claude |
| **B3a 롤업 순수 함수** | (화면 없음) 같은 원본에서 주간 실적·차기 계획·인계 초안 자료를 만든다 | `shared/rollup.mjs`: `weeklyRollup(data, {start, end, projectId?}, now)`, `handoverRollup(data, {projectId?}, now)`. 모듈 `rollup` 합성 | 월~일 기본, 시간대 5종 결정성. 사실 항목 모두 원본 Ref. 일반 작업과 인계의 이중 집계 없음. 날짜 근거 없는 메모를 실적으로 추정하지 않음. 미해결은 "현재 상태"로 따로 표시 | B1 (B2a는 사업별 범위에만) | **Claude** | Codex |
| **B3b 정리·보고 화면·내보내기** | 기간·사업을 고르고, 항목 포함·제외를 정해, 복사하거나 TXT/MD로 저장한다 | 정리 화면. 내보내기 IPC(renderer는 조건만, main이 다시 생성 — `export-ax-report` 방식). "암호화되지 않은 파일" 안내. 원본 본문·경로 출력은 기본 끔 | 핵심 흐름 종단 smoke(메모 → 작업 → 사업·근거 → 완료 → 초안). 조작 수 측정(`tests/task-flows.cjs`) | B3a, B2b | **Codex** | Claude |

**역할 원칙**
- 순수 모델·롤업(B2a·B3a)은 Claude, 화면·IPC(B2b·B3b)는 Codex가 맡는다. 같은 파일을 동시에 고치지 않도록 화면 카드는 순수 카드 병합 뒤 시작한다.
- 구현자와 검증자는 서로 바꾼다.
- Gemini는 B2b·B3b의 화면 문구와 동선을 검토한다(저장소 수정 없음).

### 4.3 B3a 롤업 출력 형태

```ts
type RollupItem = { ref: Ref; title: string; date: string | null; status: string; projectId: string | null };
type RollupSection = {
  key: "done" | "decisions" | "open" | "next" | "module";
  title: string;
  items: RollupItem[];
  note?: string;   // 예: "현재 자료 기준, 확정 보고서 아님"
};
weeklyRollup(data, { start, end, projectId?: string | null /* null = 사업 없음만 */ }, now): RollupSection[]
```

- **분류**:
  - 완료 = 기간 안의 `completedAt`(작업·인계·제출)
  - 결정 = 기간 안의 회의 `at`(B2 회의 도입 후)
  - 미해결 = 현재 미완료 전체
  - 다음 = `end` 다음 날부터 7일 안의 기한(날짜형은 날짜 키, 일시형은 현지 날짜로 비교)
- **중복**: 같은 원본(`ref`)은 한 절에 한 번만 넣는다. 일반 작업과 그 출처는 다른 원본이므로 각각 계산하고, 관계만으로 합치지 않는다.

## 5. 쟁점 (Gemini·Codex와 결정)

1. **B1 일반 작업 위치**: Codex B1이 `workItems`인지 `tasks.kind` 확장인지 확인이 필요하다.
   - 후자면 수준 4가 필요하고, 구판에서는 파일이 열리지 않는다.
   - 권고는 `workItems`다(구판 계속 사용 가능).
2. **AX 사업 저장 통합 시점**: 이번 묶음은 "한 ID 공간 + 두 저장소" 방식이다.
   - 한 저장소로 합치는 것은 구판 AX 화면을 포기하는 결정이다(수준 4·원본 백업). 사용자 결정 사항이다.
3. **`Source.title` 사본**: 삭제된 출처 표시용으로 제목만 복사한다.
   - 사용자가 출처 제목을 고친 뒤 작업 쪽 표시를 따라 바꿀지(살아 있는 출처면 원본 제목을 우선) 화면 문구를 Gemini와 맞춘다.

## 6. 확정 (2026-10-20, Gemini 승인 지시 + 사용자 승인)

| 쟁점 | 확정 |
| --- | --- |
| 일반 작업 저장 위치 | 새 선택 컬렉션 **`workItems`**. `tasks` 열거값은 바꾸지 않는다. `minReader` 상향 없음. 수준 3은 SECURITY-02 봉투 전용 |
| 사업 저장소 | `axProjects` 유지 + 일반 사업 `projects`. 단일 ID 공간(합집합 검증)과 `ProjectView` 통합 보기 |
| 출처 표시 | `source = { kind: "note" \| "call" \| "patrol", id, title }`(만들 때 제목 사본)<br>• 원본 있음: **현재 원본 제목** 우선 "출처: 전화메모 · {현재 제목}", 누르면 원본으로 이동<br>• 원본 삭제: "출처: 삭제된 전화메모 — {사본 제목}"(메모는 "삭제된 메모", 순찰은 "삭제된 순찰 기록"), 읽기 전용<br>(1.2의 `Source.type` 필드명은 **`kind`로 확정**한다. 회의는 B2 이후 추가) |

**화면 문구 표준(고정)**
- **B2b**:
  - 메뉴·화면 제목 "사업 공간"
  - 주 행동 "사업 등록", 사업을 고른 뒤에는 "작업 등록"
  - 분야 라벨: 시설(`facility`) · 자원보전(`resource`) · AX(`ax`) · 행정(`admin`) · 일반(`general`)
  - 하위 섹션: "연결된 작업", "회의·전화·순찰 기록", "근거 자료"
- **B3b**:
  - 메뉴·화면 제목 "정리·보고"
  - 보고서 유형 탭: "주간 실적·계획" / "일일 브리핑" / "사업 추진보고" / "인수인계서"
  - 주 행동: "클립보드 복사", "TXT 저장", "MD 저장"

**main 병합(지시 1)**: 지시는 "Codex 검증 완료 건"을 병합하라는 것이었다. 2026-10-20 기준 SECURITY-01·02·03, HUB-ARCH-01, REVIEW-HUB-B1-01, HUB-SCHEMA-01 카드는 모두 `review` 상태이고 검증 기록이 비어 있다. 조건을 만족하는 건이 없어 병합하지 않았다. 검증이 끝나면 병합한다. 검증 전 병합(사후 검증)은 사용자의 별도 명시 승인이 있을 때만 한다.

**실행 순서**: B2a(Claude → Codex 검증) → B2b(Codex → Claude) → B3a(Claude → Codex) → B3b(Codex → Claude). 카드 [B2a](../tasks/TASK-HUB-B2A-01.md) · [B2b](../tasks/TASK-HUB-B2B-01.md) · [B3a](../tasks/TASK-HUB-B3A-01.md) · [B3b](../tasks/TASK-HUB-B3B-01.md).

## 7. B1 통합 때 조정 (2026-10-20, Claude)

Codex B1(`origin/task/task-hub-b1-01` d7805e5)을 이 브랜치에 병합하면서 B1이 이미 구현한 계약을 기준으로 맞췄다. Codex 교차 검증 SCHEMA-B1-01~03을 반영한 것이다.

| 항목 | 이 명세 1·6장 | 통합 기준(B1) |
| --- | --- | --- |
| 출처 저장 | `workItems.source {kind,id,title}` | **`links[]`**: `{from:{type: note\|call\|meeting, id}, to:{type:"workItem", id}, role:"followUp", createdAt}`. 1:N과 다중 출처를 표현한다. B2a의 `sourceView`·`validateSource`는 제거했다 |
| 삭제된 출처 제목(6장 승인) | `source.title` 사본 | **`links[].sourceTitle?`**(선택, 500자). 후속을 만들 때 저장하고, 출처가 지워졌을 때 "출처: 삭제된 메모 — {제목}"으로 표시한다. 이 필드가 없는 기존 연결은 "출처: 삭제된 메모" 그대로 둔다(`shared/work.mjs` `sourceInfo`) |
| 순찰 출처 | `patrol` 포함 | B1 `links.from.type`은 note·call·meeting뿐이다. 순찰 출처를 더하는 것은 알려진 필드의 열거값 확장이라 판독 수준 4 설계가 필요하다(별도 카드) |
| 일시 기한 | `{kind:"at"}` | **`{kind:"datetime", at}`**와 `remindMinutes: null \| 0 \| 60 \| 1440`(일시형만, 기본 null) |
| 작업 제목 | 200자 | **500자** |
| 회의 | B2에서 도입 | B1에 이미 있다. `{id, title, body, at, attendees, createdAt, updatedAt}`. B2 필드(`projectIds`·`decisions`·`referenceIds`)는 선택 확장이다 |
| `workItems.referenceIds` | — | B2a `validateProjectLinks`가 선택 필드로 형식만 검사한다 |

## 7b. B1+B2a 통합 계약 (2026-10-20 Codex, 사용자 통합 지시 반영)

이 절은 게시된 B1과 B2a를 결합한 실제 계약이며 앞선 B1 미수신 가정을 대체한다.
- workItems의 기한은 null/date/datetime이다. remindMinutes 누락은 null(알림 없음)으로만 보완하며 시각을 추정하지 않는다. 제목500자를 보존한다.
- 새 후속 관계는 기존 links.from.type(note/call/meeting)→to.workItem, role:followUp에 저장한다. 기존 링크·회의를 삭제하거나 일괄 이관하지 않는다.
- B2a source.kind 입력이 이미 있는 workItems도 읽는다. sourceView/validateSource가 note/call/patrol/meeting과 제목500자를 처리하며 같은 출처를 중복 표시하지 않는다. 새 저장에서 source와 links 두 곳에 같은 관계를 쓰지 않는다. 삭제된 원본은 가능한 제목 사본과 작업 본문을 유지한다.
- meetings는 이미 B1에 있다. at/attendees 문자열/createdAt/updatedAt을 보존한다. 메모·전화·순찰·회의의 projectIds와 referenceIds는 선택 배열(각50개)이고 누락·끊긴 참조를 허용한다. 작업/인계의 사업 소속은 단일 projectId가 원본이다.
- projects/references와 AX의 기존 저장 위치·단일 사업 ID 공간은 유지한다. 사업 삭제가 기록·근거를 삭제하지 않는다. reader3은 봉투 전용이며 기존 links의 새 역할·순찰 출처는 이번에 추가하지 않는다.
- B2a의 희소 referenceIds 배열을 거부해 JSON null로 저장되는 경계를 보완했다. 기존 측정 스크립트의 실제 합계는14,000건이며10,000건 표기와 구별한다.

## 8. 두 통합안의 정렬 (2026-10-20 Claude, B2b 통합 때)

7장(Claude, main 5ab5675)과 7b장(Codex, B2b 브랜치)은 B1+B2a를 각각 따로 통합한 기록이다. 같은 날 같은 일을 했지만 출처 제목 사본의 저장 위치가 달랐다. B2b를 main 기준 브랜치에 병합하며 이렇게 맞췄다.

| 항목 | 정렬 결과 |
| --- | --- |
| 새 연결의 제목 사본 | **`links[].from.title`**(B2b 화면이 이 값을 쓴다) |
| main 5ab5675~04646cc판이 쓴 `links[].sourceTitle` | 계속 검증(500자)하고 읽는다. `workSources`는 `from.title`이 없으면 `sourceTitle`로 채운다. 지우거나 옮기지 않는다 |
| `sourceView`·`validateSource` | B2b 판을 쓴다(note·call·patrol·meeting, 500자, `workItems.source` 레거시 읽기) |
| 기록의 `projectIds`·`referenceIds` | B2b 판(메모·전화·순찰·회의, 선택 배열 50개) |
