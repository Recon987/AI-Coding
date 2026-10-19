# [작업 지시서] TASK-v0.3-ARCH-MODULAR-01 : 모듈형 플러그인 아키텍처 개편 및 AX 사업 관리 모듈 구축

## 1. 작업 개요 (Task Metadata)

| 항목 | 내용 |
| :--- | :--- |
| **작업 ID 및 명칭** | `TASK-v0.3-ARCH-MODULAR-01` : 공원 업무 수첩 모듈형 플러그인 아키텍처 개편 및 AX 사업 관리 모듈(AX Desk) 신규 구축 |
| **목표 버전 / 브랜치** | `v0.3-alpha` / `feat/modular-architecture` |
| **도메인 배경 및 목적** | 기존 고정 5개 탭(`Briefing`, `Patrols`, `Tasks`, `Calendar`, `Personal`) 구조를 탈피하여, 공통 코어(브리핑, 할일/인수인계, 달력, 메모) 위에 각 직무·사업 성향별 전문 도구를 켜고 끌 수 있는 **'모듈 레지스트리(Applet Registry)'** 구조를 도입한다. 1호 전문 직무 모듈로 본사 AX추진팀의 권역별 AX 과제·예산 추적, GIS/AI 스니펫 보관, 보고서 초안 생성을 지원하는 **'AX Desk'**를 탑재한다. |
| **수정 대상 파일** | • `shared/model.mjs`, `shared/model.d.mts`<br>• `desktop/store.cjs`<br>• `src/types.ts`, `src/ui.tsx`, `src/components/AppletDrawer.tsx`<br>• `src/components/AxDesk.tsx` (신규 컴포넌트)<br>• `tests/store.test.cjs`, `tests/desktop-smoke.cjs`<br>• `docs/handoff.md`, `README.md` |

---

## 2. 아키텍처 변경 명세 (Architecture Specification)

### A. 3계층 아키텍처 모델
1. **공통 코어 계층 (Core Layer)**:
   - 직무와 무관하게 모든 공단 직원이 사용하는 기본 생산성 도구: `briefing`(업무 브리핑), `tasks`(인수인계 및 마감 기한), `calendar`(월간 일정/공휴일), `personal`(개인 메모).
   - 기본 코어 4종은 사이드바 상단에 항시 고정 표시된다.
2. **모듈 레지스트리 계층 (Applet Registry Layer)**:
   - 직무별 전문 도구를 플러그인 형태로 등록/관리하는 시스템.
   - 사용자는 사이드바 하단의 **[모듈 관리]** 버튼을 통해 사용 가능한 모듈을 토글(On/Off)하고 표시 순서를 변경할 수 있다.
   - 기존의 `patrols`(현장 순찰)는 기본 활성화된 직무 모듈의 하나로 레지스트리에 편입되어, 현장직이 아닌 사용자는 비활성화할 수 있다.
3. **전문 직무 모듈 1호: AX Desk 계층**:
   - 국립공원공단 AX추진팀 전용 대시보드 모듈 (`src/components/AxDesk.tsx`).
   - 권역별(본사, 서부, 북부, 기타) 사업 진도율, 예산 집행, GIS/AI 스니펫, 보고서 초안 생성 기능 제공.

---

## 3. 데이터 스키마 및 마이그레이션 (`v0.2` → `v0.3`)

### A. `workdesk.json` 루트 스키마 확장
```typescript
interface WorkdeskDataV3 {
  schemaVersion: 3; // 기존 v0.2는 2
  // --- 기존 v0.2 코어 데이터 (100% 무손실 유지) ---
  patrols: PatrolRecord[];
  tasks: TaskRecord[];
  schedules: ScheduleRecord[];
  personalNotes: PersonalNoteRecord[];
  phoneMemos: PhoneMemoRecord[];
  briefingNotes: BriefingNoteRecord[];
  settings: AppSettings;

  // --- 신규 v0.3 확장 데이터 ---
  modules: {
    enabledModuleIds: string[]; // 예: ["patrols", "ax-desk"]
    moduleOrder: string[];
    customConfigs: Record<string, any>;
  };
  axProjects: AxProjectRecord[];
  axSnippets: AxSnippetRecord[];
}
```

### B. 신규 데이터 모델 인터페이스 (`shared/model.d.mts`)
```typescript
// 1. 모듈 메타데이터 정의
export interface AppletDefinition {
  id: string; // 고유 ID (예: 'patrols', 'ax-desk', 'gis-tool')
  name: string; // 화면 표출명 (예: '현장 순찰', 'AX 사업 관리')
  icon: string; // 아이콘 식별자 또는 이모지 (예: '🌲', '🤖')
  description: string; // 모듈 설명
  category: 'core' | 'field' | 'planning' | 'admin';
  defaultEnabled: boolean;
  componentKey: string;
}

// 2. AX 사업 과제 레코드
export interface AxProjectRecord {
  id: string;
  title: string; // 사업명 (예: '환경변화 모니터링 플랫폼 구축')
  zone: '본사' | '서부' | '북부' | '연구원/보전원' | '기타';
  stage: '기획' | '발주/계약' | '수행/실증' | '검수/완료';
  budgetTotal: number; // 총 사업비 (단위: 천원)
  budgetExecuted: number; // 집행액 (단위: 천원)
  manager: string; // 담당자
  partner: string; // 용역수행사 / 개발업체
  nextMilestone: string; // 차기 마일스톤 (예: '2026-10-31 현장 실증 테스트')
  risks: string; // 주요 리스크 및 현안
  notes: string; // 상세 메모
  updatedAt: string;
}

// 3. GIS / AI 스니펫 레코드
export interface AxSnippetRecord {
  id: string;
  title: string; // 스니펫 제목 (예: 'Sentinel-2 SCL 토지피복 차감 코드')
  category: 'GEE' | 'Python' | 'Prompt' | 'Policy';
  tags: string[]; // 태그 목록 (예: ['산사태', '위성영상', 'NDVI'])
  snippet: string; // 실제 코드 또는 프롬프트 텍스트
  description: string; // 설명 및 사용법
  updatedAt: string;
}
```

### C. 마이그레이션 및 하위 호환성 규칙 (`desktop/store.cjs`)
1. 기존 `v0.2` 데이터 로드 시 `schemaVersion`을 `3`으로 갱신하고, 변환 전 `workdesk.json.v2-backup.json` 자동 백업을 생성한다.
2. `modules` 기본값: `enabledModuleIds: ['patrols', 'ax-desk']`, `moduleOrder: ['patrols', 'ax-desk']`.
3. `axProjects`: 초기값 빈 배열 `[]`.
4. `axSnippets`: 초기 기본 샘플 스니펫 3종(GEE Sentinel-2 로드 기본식, 국립공원 위경도 DD↔DMS 변환 공식, 공단 보고서 양식 프롬프트)을 자동 탑재.

---

## 4. UI/UX 구현 명세 (`src/`)

### A. 동적 사이드바 레이아웃 (`src/ui.tsx`)
- **상단 코어 고정 탭**:
  - `📋 업무 브리핑 (Briefing)`
  - `⏱️ 인수인계·제출기한 (Tasks)`
  - `📅 월간 일정 (Calendar)`
  - `📝 업무·전화 메모 (Personal)`
- **중단 직무 모듈 섹션 (동적 렌더링)**:
  - `modules.enabledModuleIds`에 포함된 모듈만 탭으로 표출.
  - 기본: `🌲 현장 순찰 (Patrols)`, `🤖 AX 사업 관리 (AX Desk)`.
- **하단 유틸리티 버튼**:
  - `⚙️ 모듈 관리 (Applet Drawer 호출)`
  - `💾 데이터 백업/복원`

### B. 모듈 관리 서랍 모달 (`src/components/AppletDrawer.tsx`)
- 전체 등록된 모듈 목록(이름, 카테고리, 설명) 카드 표출.
- 각 모듈별 활성화 스위치(Toggle On/Off).
- 스위치 변경 시 즉시 `modules.enabledModuleIds`가 저장되고 사이드바가 리렌더링된다.

### C. AX Desk 대시보드 (`src/components/AxDesk.tsx`)
1. **탭 1: 권역별 AX 사업 관리 (Project Tracker)**:
   - 권역 필터: 전체 / 본사 / 서부 / 북부 / 연구원·보전원.
   - 사업 카드 목록: 사업명, 단계(Badge), 예산 집행률(프로그레스 바), 차기 마일스톤.
   - 신규 등록 및 수정 모달.
2. **탭 2: GIS & AI 스니펫 라이브러리 (Snippet Vault)**:
   - 언어/분야 필터: 전체 / GEE / Python / 프롬프트 / 법령·지침.
   - 키워드 및 태그 검색.
   - 코드 스니펫 원클릭 클립보드 복사(Copy) 버튼.
3. **탭 3: 공단 표준 보고서 초안 생성기 (Report Drafter)**:
   - 등록된 AX 사업을 선택하면 '1. 사업개요 / 2. 추진배경 / 3. 추진실적 / 4. 차기계획' 형태의 마크다운 보고서 초안을 자동 생성.
   - [복사] 및 [TXT/MD 내보내기] 버튼 제공.

---

## 5. 자동 검증 및 수용 기준 (Acceptance Criteria)

- [ ] **단위 테스트 (`npm test`)**:
  - `v0.2` 스키마에서 `v0.3`으로 무손실 마이그레이션 검증.
  - 모듈 On/Off 상태 저장 및 유효하지 않은 모듈 ID 무시 검증.
  - `axProjects` 및 `axSnippets` 유효성 검증(필수 항목 누락 시 저장 거부).
- [ ] **데스크톱 스모크 테스트 (`npm run test:desktop`)**:
  - 모듈 관리 모달에서 `patrols` 모듈을 껐을 때 사이드바에서 사라지고, 켰을 때 다시 복원되는지 확인.
  - `AxDesk` 탭에 진입하여 신규 AX 사업 등록 후 브리핑 요약에 마일스톤이 정상 반영되는지 확인.
  - 스니펫 라이브러리에서 복사 버튼 및 필터링 동작 확인.
- [ ] **오프라인 보안 원칙 준수**:
  - 외부 네트워크 요청 0건 유지, 로컬 JSON 크기 20MB / 항목당 10,000건 한도 유지.

---

## 6. ChatGPT Codex / Claude 실행용 프롬프트 (Copy-Paste Prompt)

> **[TASK-v0.3-ARCH-MODULAR-01 실행 지시서]**
>
> 당신은 `Recon987/AI-Coding` (공원 업무 수첩)의 구현 에이전트입니다. `AGENTS.md`의 아키텍처 규칙(오프라인, 샌드박스, 하위 호환성)을 준수하여 아래 3단계로 모듈형 플러그인 아키텍처 및 AX Desk 모듈을 구현하세요.
>
> **Step A: 데이터 모델 및 스키마 마이그레이션 (`shared/`, `desktop/`, `tests/`)**
> 1. `shared/model.mjs` 및 `shared/model.d.mts`에 `AppletDefinition`, `AxProjectRecord`, `AxSnippetRecord`, `modules` 스키마 및 유효성 검증 함수를 추가하세요.
> 2. `desktop/store.cjs`에 `v0.2 -> v0.3` 마이그레이션 로직을 작성하고, 변환 전 `workdesk.json.v2-backup.json` 자동 백업을 생성하도록 하세요.
> 3. `tests/store.test.cjs`에 마이그레이션 무결성 및 AX 데이터 유효성 검사 10건 이상을 추가하고 `npm test` 통과 후 즉시 커밋·푸시하세요.
>
> **Step B: 모듈 관리 서랍 및 동적 사이드바 (`src/`)**
> 1. `src/types.ts`에 신규 모듈 및 AX 모델 타입을 동기화하세요.
> 2. `src/components/AppletDrawer.tsx`를 생성하여 모듈 On/Off 토글 모달을 구현하세요.
> 3. `src/ui.tsx`를 수정하여 상단 코어 탭(브리핑, 할일, 달력, 메모)과 중단 동적 모듈 탭(활성화된 모듈만 렌더링), 하단 [모듈 관리] 버튼을 배치하세요.
> 4. `tests/desktop-smoke.cjs`에 모듈 토글 및 사이드바 동적 렌더링 검사를 추가하고 테스트 통과 후 커밋·푸시하세요.
>
> **Step C: AX Desk 대시보드 컴포넌트 구현 (`src/components/AxDesk.tsx`)**
> 1. `src/components/AxDesk.tsx`를 구현하세요:
>    - 권역별 AX 과제 목록 / 등록 / 진행 단계(Badge) / 예산 집행률 바 표출
>    - GIS·AI 스니펫 보관함(GEE/Python/프롬프트 필터, 검색, 원클릭 복사)
>    - 공단 표준 보고서 양식 텍스트 초안 자동 생성기
> 2. `npm test` 및 `npm run test:desktop`을 전체 실행하여 모든 테스트가 통과하는지 확인하세요.
> 3. `docs/handoff.md`와 `docs/validation.md`를 갱신하고 최종 커밋·푸시 후 `[GEMINI_HANDOFF_PACKET]`을 출력하세요.
