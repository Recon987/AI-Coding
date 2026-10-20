# 범용 업무 허브 — 기술 설계·개발 계획 (Claude 응답)

- **작성**: 2026-10-20, Claude. 과제 [TASK-HUB-ARCH-01](../tasks/TASK-HUB-ARCH-01.md).
- **상태**: 제안. Gemini 화면 설계·Codex 통합 전이다. 구현 카드는 **초안**이며 ready로 확정하지 않았다.
- **기준**:
  - 방향안: [direction-2026-10-20.md @ f632273](https://github.com/Recon987/AI-Coding/blob/f632273/docs/product/direction-2026-10-20.md)
  - 제품 main: ea3105e
  - 작업 브랜치 `claude/zen-cannon-wc1at4`: SECURITY-02 저장 봉투와 SECURITY-03 백업 암호를 포함하며 review 상태다.
- **이번 작업에서 하지 않은 것**: 제품 코드·스키마 변경, API 접속.

## 0. 결론

1. **새 기록은 새 선택 컬렉션으로, 관계는 별도 연결표로 둔다.**
   - 새 선택 컬렉션: `workItems`, `projects`, `meetings`, `resources`. 관계 연결표: `links`.
   - 기존 `tasks`·`notes`·`calls`·`patrols`·`axProjects` 레코드에는 필드를 더하지 않는다.
   - 그래서 구버전 앱(모르는 최상위 항목 보존, TASK-SCHEMA-01)과 섞어 써도 손실이 없고, `READER_VERSION`을 올릴 필요가 없다.
2. **짧은 할 일은 `WorkItem`(projectId 없음)이다.**
   - 기존 인수인계·제출(`tasks`)은 전문 업무로 그대로 두고, "오늘의 업무"가 읽기 어댑터로 함께 보여 준다. 일괄 변환은 하지 않는다.
3. **모듈은 "메뉴 항목"에서 "코어에 기여하는 순수 계약"으로 넓힌다.**
   - 계약 항목: 필드 확장, 보기, 행동, 기한·보고 기여, 검색, 버전·변환.
   - 앱에 포함된 코드만 쓴다. 임의 스크립트 실행은 없다.
4. **첫 개발 묶음은 카드 3장이다**(5장의 B1→B2→B3).
   - 핵심 흐름(메모 → 후속 작업 → 사업·자료 연결 → 기한 → 완료 → 주간 실적·인계 초안)이 끝까지 돈다.
5. **기관 API는 main 프로세스 어댑터 뒤에 둔다.**
   - 첫 단계는 읽기 전용, 그것도 가상 어댑터다.
   - 실제 접속은 별도 범위 합의 뒤에 한다(AGENTS.md 원칙 1).

## 1. 현재 구현과 목표의 핵심 격차 (5개)

| # | 격차 | 근거 | 목표에 미치는 영향 |
| --- | --- | --- | --- |
| G1 | 일반 업무 단위가 없다. `Task`는 `kind: "handover" \| "submission"`만 있고 담당자·전달처·`patrolId`에 묶인다. 상태는 `done` 하나뿐이다(진행·대기 없음). | `src/types.ts:55`, `shared/model.mjs:438·452` | 회의 후속·조사·자료 취합 같은 짧은 할 일을 인계/제출로 억지로 적게 된다 |
| G2 | 일반 사업이 없다. 사업은 `AxProject`(AX 권역 열거·예산·마일스톤 한 개)뿐이다. | `src/types.ts:117` | 시설·조사·행정 사업을 담을 그릇이 없고, AX 전용 필드가 코어를 대신한다 |
| G3 | 기록 사이의 관계가 없다. 연결은 `Task.patrolId` 하나다. 메모·전화(`Call.done`)는 후속 작업을 낳지 못한다. 검색은 종류별 부분일치다. | `src/types.ts:21`, `shared/search.mjs:46` | 회의 → 작업 → 근거 자료로 다시 찾아가려면 사람이 기억해야 한다(중복 입력의 원인) |
| G4 | 모듈 계약이 메뉴 수준이다. `applets.mjs`는 id·이름·아이콘·pages만 정한다. 필드·화면·보고 기여는 `src/main.tsx`(924줄)와 각 화면에 박혀 있다. | `shared/applets.mjs:6–43` | 모듈 하나를 더할 때마다 코어 화면·브리핑·검색을 직접 고쳐야 한다 |
| G5 | 보고가 종류별로 따로 만들어진다. `briefing`(하루), `buildForm`(순찰·단속 양식), `buildAxReport`(AX 1건) 각각이다. 기간·사업을 가로지르는 실적·인계 초안이나 근거 역참조는 없다. | `shared/model.mjs:1087`, `shared/forms.mjs`, `shared/ax-report.mjs` | 주간 실적·인계를 다시 손으로 모은다 |

유지할 기반은 다음과 같다.
- 단일 원본에서 파생하는 달력·브리핑(`calendarItems`·`reminderItems`)
- 자료 보존 장치: 원자 저장, last-good, 보호본, 모르는 최상위 항목 보존
- 저장 봉투·백업 암호(SECURITY-02·03)
- 모듈 메뉴, 순찰·AX 화면

성능 저하는 측정한 근거가 없으므로 격차로 넣지 않았다(B1에서 측정한다).

## 2. 최소 모델

모두 **선택 최상위 컬렉션**이다. 이 필드가 없는 기존 v3 파일도 빈 목록으로 열린다. 기존 v3 파일의 다른 항목은 바꾸지 않는다. 이름은 제안이며 Codex 통합 때 확정한다.

```ts
type Ref = { type: RefType; id: string };
type RefType =
  | "workItem" | "project" | "meeting" | "resource"            // 새 코어
  | "note" | "call" | "task" | "event" | "patrol" | "axProject"; // 기존 원본(변경 없음)

type WorkItem = {               // 짧은 할 일 = projectId 없음
  id: string; title: string; body: string;
  status: "todo" | "doing" | "waiting" | "done";
  due: string | null;           // 로컬 날짜 "YYYY-MM-DD" 또는 ISO 일시(shared/dates.mjs 규칙)
  projectId: string | null;
  owner: string;                // 자유 입력(기관 계정 연계 전까지 문자열)
  priority: "normal" | "high";
  createdAt: string; updatedAt: string; completedAt: string | null;
};
type Project = {
  id: string; title: string; summary: string;
  status: "planned" | "active" | "paused" | "done";
  owner: string; start: string | null; due: string | null;
  module: { id: string; ref: Ref } | null;   // 예: { id: "ax-desk", ref: { type: "axProject", id } }
  createdAt: string; updatedAt: string;
};
type Meeting = {                // 회의 기록. 전화는 기존 calls를 그대로 쓴다
  id: string; title: string; at: string; attendees: string; body: string;
  projectId: string | null;
  decisions: { id: string; text: string }[];  // 결정은 회의 안에 둔다(독립 수명이 생기면 분리)
};
type Resource = {               // 근거 자료 "참조"만. 파일 본문은 JSON에 넣지 않는다
  id: string; title: string;
  kind: "file" | "folder" | "docNo" | "note";  // docNo: 공문·문서번호 같은 식별자
  path: string | null; docNo: string | null; note: string; addedAt: string;
};
type Link = {                   // 방향 있는 관계 한 줄
  id: string; from: Ref; to: Ref;
  role: "followUp" | "partOf" | "evidence" | "related";
  createdAt: string;
};
```

### 관계 규칙

- **소속(사업)**: `WorkItem.projectId`·`Meeting.projectId`로 직접 둔다. 가장 흔한 질의라 연결표를 거치지 않는다. 그 밖의 소속, 예를 들어 기존 메모·순찰을 사업에 넣는 것은 `Link{role:"partOf"}`로 둔다.
- **후속**: 회의·전화·메모·순찰에서 만든 작업은 `Link{from: 원본, to: workItem, role:"followUp"}`로 둔다. 원본 레코드는 고치지 않는다.
- **근거**: `Link{from: workItem|project|meeting, to: resource, role:"evidence"}`로 둔다.
- **끊긴 참조**: 구버전 앱이 원본을 지울 수 있으므로 거부하지 않고 "삭제된 기록"으로 표시한다. 고아 연결 정리는 사용자가 확인한 뒤에만 한다.
  - 이 점에서 `Task.patrolId`의 엄격 검증과 다르다. 연결표는 구버전이 모르는 항목이기 때문이다.
- **삭제**: 작업·사업을 지우면 그 기록을 가리키는 `links`만 함께 지운다. 상대 원본은 지우지 않는다. 사업을 지워도 소속 작업은 "사업 없음"으로 남긴다(자료 보존 원칙).

### 기존 자료와의 호환·연결

| 기존 | 처리 | 이유 |
| --- | --- | --- |
| `tasks`(인수인계·제출) | 그대로 둔다. "오늘의 업무"와 기간 보고에 **읽기 어댑터**로 합쳐 보인다(`kind`·`patrolId` 유지). 사업에 넣을 때는 `Link{role:"partOf"}` | 일괄 변환하면 구버전·알림·양식 계약이 깨진다. 통합 여부는 쟁점 1 |
| `notes`·`calls` | 회의·전화 메모의 원본으로 쓴다. "후속 작업 만들기"는 링크만 추가한다 | 필드 추가 없이 G3 해소 |
| `axProjects` | AX 모듈의 확장 레코드로 유지한다. `Project.module = {id:"ax-desk", ref}`로 일반 사업과 1:1로 잇는다. 기존 AX 사업에 일반 사업 껍데기를 만드는 일은 사용자가 고를 때만 한다 | AX 필드(권역·단계·예산)를 코어에 올리지 않는다 |
| `patrols` | 원본 그대로. 후속 작업은 `followUp`, 사업 소속은 `partOf` 링크 | 순찰은 사업이 아니라 기록 |
| `events` | 일정 원본으로 남긴다. `WorkItem.due`는 `calendarItems`·`reminderItems`에 **파생**으로 더한다(복제 없음) | AGENTS.md 원칙 4 |
| `folders` | 바로가기로 유지한다. 근거 자료는 `resources`이며, 같은 경로라도 별도로 둔다 | 바로가기와 근거의 수명이 다르다 |

### 저장·암호화·백업

- 새 컬렉션은 v3 내용 안에 있다. 그래서 SECURITY-02 저장 봉투(`sealed`)와 SECURITY-03 백업 봉투(`backupSealed`)가 **수정 없이** 함께 봉한다. 백업·복원·보호본 규칙도 그대로다.
- `READER_VERSION`(현재 3, 봉투 전용)은 올리지 않는다.
  - 새 컬렉션은 구버전에서 "모르는 최상위 항목"으로 보존된다(`shared/model.mjs:462`, 최대 100개).
  - 이후 **기존 열거값**을 늘리면(예: `Task.kind`에 새 값) 그때 규칙대로 올린다.
- **한도**: 종류별 10,000건, 평문 20MB를 유지한다.
  - 추정: 작업 10,000건 × 약 0.5KB = 5MB, 링크 10,000건 × 약 0.2KB = 2MB.
  - 첨부 본문을 넣지 않으므로 첫 묶음은 JSON으로 충분하다고 본다(B1에서 실측, 쟁점 3).
- 근거 파일의 경로는 평문 데이터 안에 있으므로 봉투로 보호된다. 다만 파일 자체는 앱 밖에 있어 암호화되지 않는다. 화면에 이 사실을 적는다.

## 3. 전문 모듈 계약

`shared/applets.mjs`를 넓힌다. 각 모듈은 `shared/modules/<id>.mjs`의 **순수 함수 묶음**이다. DOM·Electron·네트워크를 쓰지 않고, 앱에 포함된 코드만 쓴다.

```ts
type ModuleContract = {
  id: string; name: string; category: string;
  contract: 1;                 // 코어가 이해하는 계약 판 — 코어가 모르면 그 모듈을 숨기고 자료는 보존
  version: number;             // 모듈 자료 판 — 올릴 때 migrate 제공
  collections: string[];       // 모듈이 소유한 최상위 컬렉션(예: ["axProjects","axSnippets"])
  validate(data): void;        // 소유 컬렉션 검증(normalize가 호출)
  fields?: {                   // 코어 레코드에 붙는 전문 필드 — 모듈 컬렉션에 두고 Ref로 연결
    project?: { label: string; read(data, project): FieldValue[] };
  };
  views: { page: string; title: string }[];     // 화면(React 컴포넌트는 src/modules/<id>/에서 page로 연결)
  actions: {                   // 코어 화면에 나타나는 행동
    id: string; label: string; on: RefType;     // 예: 순찰에서 "후속 작업 만들기"
    run(data, ref, input): { data: Data; created: Ref[] };   // 순수: 새 data를 돌려줌
  }[];
  deadlines?(data, range): DeadlineItem[];      // 오늘의 업무·달력·알림에 파생으로 기여
  report?(data, period): ReportSection[];       // 주간 실적·인계 초안에 기여(근거 Ref 필수)
  search?(data): SearchRow[];
  migrate?(data, fromVersion): Data;
};
```

### 계약 규칙

- **자료 보존**: 모듈을 꺼도 자료는 보존된다(지금과 같다).
  - 코어가 모르는 `contract` 판의 모듈 자료는 읽기 전용으로 숨긴다.
  - 모듈 `version`을 올릴 때는 저장 전 원본 백업 규칙을 따른다(v1/v2 변환과 같다).
- **원본 반환**: `actions.run`·`report`는 원본 Ref를 돌려줘야 한다. 그래서 보고서 항목에서 원본으로 되돌아갈 수 있다(방향안 6장 지표 "실적 초안의 사실 항목에 원본 참조").
- **권한**: 지금은 없다(개인 단독). 기관 연계 뒤에 `permissions?: string[]`를 추가할 자리만 둔다(5장).

### 사례 A: AX

| 계약 항목 | AX가 제공 | 코어가 재사용 |
| --- | --- | --- |
| 자료 | `axProjects`·`axSnippets`(소유, 기존 그대로) | 일반 `Project`의 작업·회의·자료·활동 |
| fields.project | 권역·단계·예산·집행률 | 사업 공간 개요 카드에 표시만 |
| deadlines | `nextMilestoneDate`(지금 브리핑 AX 마일스톤 절을 이 계약으로 옮김) | 오늘의 업무·달력·알림 |
| report | 집행률 변화, 다음 마일스톤 | 주간 실적 초안의 사업별 절 |
| actions | "AX 보고서 초안"(기존 `buildAxReport`) | 내보내기 IPC 패턴 |

### 사례 B: 순찰

| 계약 항목 | 순찰이 제공 | 코어가 재사용 |
| --- | --- | --- |
| 자료 | `patrols`·`controls`·`zones` | — (순찰은 사업이 아니다) |
| actions | 순찰 기록에서 "후속 작업 만들기", 기존 "인계 만들기"(`patrolId`) | `WorkItem` + `followUp` 링크 |
| deadlines | 통제 종료일 | 오늘의 업무 |
| report | 기간 순찰 n건, 주의·긴급 건, 단속 집계(개인정보·금액 없음 유지) | 주간 실적 초안 |
| search | 기존 `searchText.patrol` | 통합 검색 |

### 판정 기준

세 번째 모듈(예: 시설 정비)을 더할 때 코어 파일은 등록 목록 한 줄만 바꾸면 된다.
- 바꾸지 않는 것: `shared/model.mjs` 검증 분기, `briefing`, `searchRecords`, `src/main.tsx` 화면 분기
- 이를 B1~B3 뒤 별도 검사로 확인한다(Codex 검증 항목 제안).

## 4. 첫 개발 묶음 — 구현 카드 초안 3장

모두 **초안**이다. 파일(`docs/tasks/`)은 만들지 않았고, Gemini 화면 설계를 반영한 뒤 사용자 승인으로 ready가 된다.

### B1. 공통 업무 모델과 "오늘의 업무" — 메모·전화에서 후속 작업까지

- **사용자 결과**
  - 사업 없이도 할 일을 한 줄로 바로 등록한다.
  - 회의·전화 메모 화면에서 "후속 작업 만들기"를 누르면 제목·기한이 채워진 작업이 생기고 원본으로 되돌아갈 수 있다.
  - "오늘의 업무"가 다음을 한 화면에 모아 보여 준다: 기한 지남 / 오늘 / 이번 주 / 회신 대기, 기존 인수인계·제출 기한.
  - 완료하면 달력·브리핑·알림에 바로 반영된다.
- **범위**
  - 선택 컬렉션 `workItems`·`meetings`·`links`의 검증·정규화. 위치는 `shared/work.mjs`(신규)이며 `normalize`에 연결한다.
  - `tasks` 읽기 어댑터.
  - `calendarItems`·`reminderItems`·`briefing`에 작업 기한 파생.
  - 빠른 등록(전역 단축키는 화면 안 `Ctrl+N` 수준으로 한정).
  - 메모·전화·회의 → 후속 작업.
  - 통합 검색에 작업·회의 추가.
- **완료 조건**
  - 구버전 v3 파일이 무손실로 열린다.
  - 새 컬렉션이 있는 파일을 현재 main 판독 규칙(모르는 항목 보존)으로 열고 저장하면 새 항목이 남는다. 실제 구판 판독 규칙으로 검사한다(SECURITY-02 reader-2 검사와 같은 방식).
  - 끊긴 링크는 "삭제된 기록"으로 표시되고 거부하지 않는다.
  - 메모 → 후속 작업 → 완료가 실제 앱에서 원본 재입력 0회로 끝난다.
  - 10,000건 가상 자료로 다음을 측정해 기록한다(목표치는 방향안 6장, 측정 전 단정 없음):
    - 오늘의 업무 첫 표시와 검색 응답 시간
    - 파일 크기
  - 저장 봉투·백업 암호 경로로 새 컬렉션이 왕복한다.
- **의존**: SECURITY-02·03 검증 결과 반영(봉투 경로 회귀 확인). Gemini "오늘의 업무" 와이어프레임.
- **검증 범위**
  - 단위: 모델·파생·어댑터·끊긴 참조·한도
  - 실제 앱 smoke 1개(핵심 흐름 전반부)
  - 기존 `test:desktop` 전체
  - 화면 검토는 바뀐 화면만

### B2. 사업 공간과 근거 자료 연결

- **사용자 결과**
  - 사업을 만들고 한 화면에서 개요·작업(목록/보드)·회의·결정·근거 자료·활동을 본다.
  - 작업과 회의를 사업에 넣고 빼는 일은 기록을 다시 쓰지 않고 연결만 바꾼다.
  - 근거 파일·폴더·문서번호를 연결하고, 파일이 옮겨지거나 없으면 "찾을 수 없음"으로 표시한다.
  - 기존 AX 사업을 일반 사업과 연결하면 AX 필드가 개요에 함께 보인다.
- **범위**
  - 선택 컬렉션 `projects`·`resources`.
  - 사업 공간 화면.
  - 근거 연결 IPC: 파일·폴더 선택, 존재 확인, 폴더에서 보기.
    - **파일 실행은 하지 않는다**(AGENTS.md 원칙 2). 탐색기에서 위치 보기(`shell.showItemInFolder`)만 허용한다. 실행 허용 여부는 쟁점 2와 함께 결정한다.
  - 모듈 계약 1판(`contract:1`)의 `fields.project`·`deadlines`·`report` 자리를 만들고 AX를 이 계약으로 이관한다(브리핑 AX 절 포함, 동작 동일).
- **완료 조건**
  - 사업 삭제 시 작업·회의·자료 원본은 남는다(링크만 정리, 확인창).
  - 근거 경로 검증: 절대 경로, 4096자, 존재 여부는 표시만.
  - AX 이관 전후 브리핑·보고서 출력이 바이트 단위로 같다.
  - 모듈 계약으로 AX를 끄고 켜도 자료가 보존된다.
- **의존**: B1. Gemini "사업 공간" 와이어프레임.
- **검증 범위**
  - 단위: 사업·링크 연산, 근거 경로 검증, AX 계약 이관 전후 출력 동등성
  - 실제 앱 smoke 1개(사업 공간·근거 연결)
  - 기존 AX smoke 3종 회귀

### B3. 정리·보고 — 주간 실적·인계 초안

- **사용자 결과**
  - 기간(이번 주 기본)과 사업(전체·하나)을 고르면 다음 초안이 나온다:
    - 완료 작업
    - 회의 결정
    - 진행 중·대기
    - 다음 주 기한
    - 모듈 기여: AX 마일스톤, 순찰 집계
  - 각 항목은 원본으로 이동할 수 있다.
  - 인계 초안에서 남은 항목을 골라 기존 "인수인계" 기록으로 만들 수 있다(`tasks` handover, 원본 링크 유지).
  - TXT·Markdown으로 내보낸다.
- **범위**
  - `shared/report-period.mjs`(순수): 기간 경계는 `shared/dates.mjs`의 로컬 날짜 규칙을 따른다.
  - 모듈 `report` 기여 합성.
  - 정리·보고 화면.
  - 내보내기 IPC: renderer는 조건만 보내고 main이 다시 만든다. `export-ax-report`와 같은 방식이다.
- **완료 조건**
  - 같은 가상 자료로 결과가 결정적이다(시간대 5종 검사).
  - 모든 사실 항목에 원본 Ref가 있다.
  - 내보낸 파일에 "암호화되지 않은 파일" 안내가 있다(설계 7장).
  - 핵심 흐름 전체(메모 → … → 실적·인계 초안)가 실제 앱에서 끝까지 돈다.
  - 수동 정리 대비 조작 수를 측정해 기록한다.
- **의존**: B1(필수), B2(사업별 보고). Gemini "정리·보고" 와이어프레임과 수용 기준.
- **검증 범위**
  - 단위: 기간·합성·결정성
  - 실제 앱 smoke 1개(전체 흐름 종단)
  - 업무 과업 측정(`tests/task-flows.cjs`)에 새 과업 추가

**나누지 않은 것(다음 묶음)**:
- 보드 끌어 놓기
- 반복 작업
- 사업 템플릿(시설·조사·행정)
- 전역 OS 단축키
- 첨부 관리 폴더
- SQLite/FTS

## 5. 기관 API 어댑터 경계

**가정 표시**: 아래에서 *(가정)*이 붙은 것은 기관 계약을 확인하지 않은 것이다. `docs/erp-integration.md`의 ERP 매핑도 아직 확인 전이다.

| 층 | 책임 | 어디서 |
| --- | --- | --- |
| 어댑터 인터페이스 | `readOrg()`, `readPeople()`, `readSchedule(range)` → 코어 형식. 이후 `listSharedItems/postComment/...` | **main 프로세스** `desktop/adapters/<name>.cjs`. renderer는 지금처럼 명시 IPC만 쓴다(원칙 2) |
| 가상 어댑터 | 고정 가상 자료. 화면에 "가상 연결" 표시 | 첫 구현. 실제 API로 착각할 수 없게 한다 |
| 실제 어댑터 | 기관 인증 방식 *(가정: SSO/토큰)*, 엔드포인트 *(미확인)* | 별도 범위 합의 뒤. 배포 앱의 네트워크 허용은 운영·보안 승인 사항 |

### 책임 구분

- **계정**
  - 로컬 기록의 `owner`는 문자열이다.
  - 연계 뒤에는 `externalId`(기관 사용자 ID)를 별도 매핑표에 둔다. 기존 자료는 바꾸지 않는다.
  - 인증 토큰은 `safeStorage`로 감싸 저장한다(SECURITY-02와 같은 보호기). 토큰은 자료 JSON에 두지 않는다.
- **권한**
  - 서버가 판정한다. 앱은 표시와 사전 차단만 한다.
  - 개인 기록(오프라인 원본)은 서버로 나가지 않는다. 사용자가 "공유"를 고른 항목만 나간다 *(가정: 서버 저장소 존재)*.
- **읽기 전용 연계(1단계)**
  - 조직·사람·일정을 캐시로만 둔다(`remote.*` 별도 컬렉션, 봉투로 봉함).
  - 캐시는 로컬 원본을 덮지 않는다.
  - 출처·가져온 시각을 표시한다.
- **공유 작업·댓글(2단계 이후)**
  - 공유 레코드는 **서버가 원본**이다. 각 레코드에 `remoteId`·`etag`(또는 버전)를 둔다.
  - 오프라인 변경은 송신 대기열에 쌓는다.
- **충돌**
  - 같은 레코드의 서버 버전이 바뀌었으면 자동 병합하지 않는다.
  - 두 판을 보여 주고 사용자가 고른다. 지운 쪽과 바뀐 쪽이 충돌하면 바뀐 쪽을 보존한다.
  - 충돌 결정은 활동 이력에 남긴다.
- **감사·알림·메시지**
  - 서버 책임 *(가정)*.
  - 기관 메신저 API가 있으면 메시지는 그쪽 연계를 우선 검토하고 자체 메신저는 만들지 않는다.
- **오프라인 원칙**
  - 개인 모드는 지금처럼 네트워크 0이다.
  - "기관 연결 모드"는 설정으로 명시적으로 켜고, 실패해도 로컬 작업은 계속된다.

## 6. Gemini·Codex와 결정할 쟁점 (3개)

1. **`tasks`(인수인계·제출)를 `WorkItem`으로 합칠지**
   - 권고: 합치지 않는다. 읽기 어댑터로 한 목록에 보이고, 인수인계·제출은 전문 행동(전달처·알림·양식)으로 남긴다.
   - 반대 근거: 목록 두 개의 정신 모델.
   - Gemini 화면이 "한 종류처럼" 보이게 할 수 있으면 데이터는 분리를 유지한다.
2. **근거 자료를 경로 참조로만 둘지, 앱 관리 폴더로 복사할지**
   - 경로 참조는 가볍지만 파일 이동에 약하고, 파일 자체는 암호화되지 않는다.
   - 관리 폴더 복사는 안정적이지만 용량·암호화(봉함 사본?)·백업 범위가 커진다.
   - 권고: B2는 경로 참조와 "찾을 수 없음" 표시로 시작하고, 관리 폴더는 사용 데이터를 본 뒤 결정한다.
   - 파일 "열기"(실행) 허용 여부도 함께 정한다. 현재 원칙은 금지다.
3. **저장 엔진 전환 시점(JSON 20MB → SQLite/FTS)**
   - 권고: 첫 묶음은 JSON을 유지하고, B1에서 10,000건 측정치로 결정한다.
   - 전환하려면 다음 계약을 새로 설계해야 한다: 원자 저장·last-good·봉투 암호화·백업 암호·구버전 보존.
   - 그래서 별도 카드로 다룬다.

## 7. 확인한 사실과 가정

- **확인한 사실**(코드·문서로 확인): 1장 표의 파일 위치, 모르는 최상위 항목 보존, 봉투·백업 형식, 한도.
- **가정**:
  - 2장의 크기 추정
  - 5장의 기관 인증·서버 저장·메신저 API 존재
  - 4장 카드의 화면 구성(Gemini 결과로 바뀔 수 있음)
- **측정하지 않은 것**: 런타임 성능. B1 완료 조건에 넣었다.
