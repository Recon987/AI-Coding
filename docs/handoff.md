# AI-Coding 작업 인계장 (`docs/handoff.md`)

**저장소**: `Recon987/AI-Coding` (`main`) · **앱/데이터 버전**: `0.5.0` / `v3` (`v1`/`v2` 자동 백업 후 전환, 기존 `v3` 무손실 호환)

이 문서는 **ChatGPT Codex**와 **Gemini**가 `공원 업무 수첩 (Park Workdesk)` 작업을 주고받을 때 쓰는 단일 인계장이다. 규칙은 [AGENTS.md](../AGENTS.md), 실행 증빙은 [docs/validation.md](validation.md), 아키텍처는 [docs/architecture.md](architecture.md)에 기록한다.

## 1. 최신 인계 패킷

```markdown
### [GEMINI_HANDOFF_PACKET]
- **Repository & Branch**: Recon987/AI-Coding (main)
- **Base Commit**: bd74297a36ac9c025105a334339007b375296cef (v0.4.0 / TASK-OFFICE-01)
- **Completed Steps & Modified Files**:
  - `TASK-CALENDAR-01` (v0.5.0 — 오프라인 법정공휴일·대체공휴일 및 반복 일정 파생 표시):
    - `shared/model.mjs`, `shared/model.d.mts`: `RECURRENCE` (`none | daily | weekly | monthly | yearly`), `RECURRENCE_LABEL`, `eventItem`의 `recurrence`·`repeatUntil` 검증, `holidaysForYear(year)`·`holidayName(date)`(양력 법정공휴일 + 2025~2035 음력 공휴일 + 공휴일법 기준 대체공휴일 계산), `expandEventOccurrences(event, range)`(월말·윤년 보정 포함), `calendarItems(data, range)`·`reminderItems(data, now)`·`briefing(data, date)` 연동.
    - `src/types.ts`, `src/components/Calendar.tsx`, `src/components/Briefing.tsx`, `src/main.tsx`, `src/style.css`: 월간 달력 셀 및 선택 날짜 헤더 공휴일 배지, 개인 일정 반복 주기·반복 종료일 입력/수정 UI, 브리핑 화면·TXT 공휴일 및 반복 일정 표시, 통합 검색 반복 주기 텍스트 반영.
    - `tests/store.test.cjs`, `package.json`, `README.md`, `docs/validation.md`, `docs/handoff.md`: 반복 일정·공휴일 단위 테스트 3종 추가(총 22/22 통과) 및 v0.5.0 문서 갱신.
- **Changed Interfaces / Schema Diff**:
  - `EventItem`: `recurrence?: "none" | "daily" | "weekly" | "monthly" | "yearly"`, `repeatUntil?: string | null` 선택 필드 추가(기존 `v3` 단일 일정은 속성 추가 없이 바이트 단위 동일 보존).
  - 신규 함수: `holidaysForYear(year)`, `holidayName(date)`, `expandEventOccurrences(event, range?)`.
  - 확장 함수: `calendarItems(data, range?)`, `reminderItems(data, now?)`.
- **Test Status**:
  - `tests/store.test.cjs` (16/16) 및 `tests/office.test.cjs` (6/6) 총 **22/22** 통과.
- **Remaining Work for Codex**:
  1. 본 `v0.5.0` 변경본 커밋·푸시 후 Node 24 환경에서 `npm run test:desktop`(반복 일정·공휴일 UI 시나리오 추가 가능) 및 GitHub Actions Windows 패키징(`windows-build.yml`) 실행 확인.
  2. 다음 백로그 착수:
     - **TASK-TRAY-01**: 시스템 트레이 상주 옵션(창 닫기 시 트레이 최소화 토글, 절전 복귀 후 알림 점검, 종료 메뉴).
     - **TASK-CALENDAR-02**: 반복 일정 회차별 개별 완료·예외일(`excludedDates`) 처리.
     - **TASK-LAW-01**: 오프라인 법령·지침 반입 및 조문 검색.
- **Modified Code Snippets (if uncommitted)**: `AI-Coding-v0.5.0.zip` 전체 반영 완료.
```

## 2. 다음 백로그 우선순위

1. **TASK-TRAY-01 (트레이 상주 및 알림 안정화)**: 창 닫기 시 트레이 상주 옵션(`settings` 또는 메뉴 토글), 절전(`resume`) 복귀 시 알림 루프 재점검, 중복 알림 방지 유지.
2. **TASK-CALENDAR-02 (반복 일정 예외/회차별 완료)**: 반복 일정 중 특정 날짜만 제외(`excludedDates`)하거나 특정 회차만 완료 처리하는 모델 확장.
3. **TASK-SECURITY-01 (저장·백업 암호화)**: Windows DPAPI/`safeStorage` 검토, 백업 암호키 분실·복구 정책, 대용량 파일 성능 검증.
4. **TASK-LAW-01 (법령·지침 오프라인 검색)**: 허용된 로컬 JSON/CSV/TXT 반입 및 조문·키워드 검색.
5. **TASK-LEDGER-01 (행정 장부)**: 예산·급량비·물품 장부 데이터 모델 및 집계.

## 3. 작업 시작·종료 체크리스트

### 시작할 때

1. `git status -sb`와 최신 커밋을 확인한다.
2. 이 문서의 최신 패킷에서 완료 범위, 미완료 작업, 건드리면 안 되는 제약을 읽는다.
3. 데이터 스키마·IPC·빌드 설정을 바꿀 계획이면 기존 백업 호환성과 테스트 영향을 먼저 적는다.

### 멈추거나 인계할 때

1. 실행한 검증 명령과 통과 여부를 사실대로 적는다.
2. 커밋하지 못한 변경이 있으면 `git diff` 핵심 요약을 패킷에 남긴다.
3. 문서를 갱신하고 같은 형식으로 다음 담당 에이전트가 바로 이어받을 수 있게 한다.
