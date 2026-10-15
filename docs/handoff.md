# AI-Coding 작업 인계장 (`docs/handoff.md`)

**저장소**: `Recon987/AI-Coding` (`main`) · **앱/데이터 버전**: `0.5.1` / `v3` (`v1`/`v2` 자동 백업 후 전환, 기존 `v3` 무손실 호환)

이 문서는 **ChatGPT Codex**와 **Gemini**가 `공원 업무 수첩 (Park Workdesk)` 작업을 주고받을 때 쓰는 단일 인계장이다. 규칙은 [AGENTS.md](../AGENTS.md), 실행 증빙은 [docs/validation.md](validation.md), 아키텍처는 [docs/architecture.md](architecture.md)에 기록한다.

## 1. 최신 인계 패킷

문서의 커밋 해시는 작성 직전 확인한 원격 기준이다. 문서를 포함한 최종 해시는 응답 패킷과 git log -1에서 확인한다.

```markdown
### [GEMINI_HANDOFF_PACKET]
- **Repository & Branch**: Recon987/AI-Coding (main)
- **Latest Pushed Commit**: c32d5904ddb3ee15e3a36a89ac98649f513f83cf - Add files via upload
- **Completed Steps & Modified Files**: Gemini TASK-CALENDAR-01 확인·통합. 독립 UI 검토 2회와 구현: src/main.tsx, drafts.ts, components/{EditorDialog,Sheet,Briefing,Calendar,Office,OfficeDirectory,Patrols,Personal,Tasks}, style.css, tests/{desktop-smoke,review-fixture,ui-review}.cjs, README·validation·ui-review-loop 및 캡처/측정.
- **Changed Interfaces / Schema Diff**: 앱0.5.1 / 자료v3. 공휴일·반복필드/함수 유지. 편집 dirty registry, 검색 overlay, 추가/수정 modal·원문펼침. 기존 IPC 유지.
- **Test Status**: baseline npm test22/22·test:desktop 통과; 통합 후도 두 검사 통과. UI83항목/페이지오류0/외부요청0. Windows 확인 예정.
- **Remaining Work for Gemini**: 다음 TASK-TRAY-01(옵트인 상주·종료·resume알림), 오래된 일간반복400회 탐색상한 선행수정. Codex 진행 중. 회차별완료/예외는CALENDAR-02. 타이포/날짜표기등 UI후속은ui-review-loop 참조.
- **Modified Code Snippets (if uncommitted)**: 완성된 UI 단계 즉시 커밋·푸시. 미완성 코드 없음.
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

## 보존한 Gemini TASK-CALENDAR-01

양력 법정/대체 및2025~2035 음력 공휴일, recurrence/repeatUntil 선택필드, holidaysForYear/holidayName/expandEventOccurrences/calendarItems(range)/reminderItems(now)/briefing 연계를 유지한다. 원본 하나에서회차를파생한다. 기존v3누락필드에임의기본값을쓰지않는다. 기준선 c32d590 npm test22/22·desktop통과. 검토에서발견한400회원본탐색상한은현재/먼미래반복조회와resume알림에영향을주므로TRAY선행수정대상이다.
