# AI-Coding 작업 인계장 (`docs/handoff.md`)

**저장소**: `Recon987/AI-Coding` (`main`) · **앱/데이터 버전**: `0.6.1` / `v3` (`v1`/`v2` 자동 백업 후 전환, 기존 `v3` 무손실 호환)

이 문서는 **ChatGPT Codex**와 **Gemini**가 `공원 업무 수첩 (Park Workdesk)` 작업을 주고받을 때 쓰는 단일 인계장이다. 규칙은 [AGENTS.md](../AGENTS.md), 실행 증빙은 [docs/validation.md](validation.md), 아키텍처는 [docs/architecture.md](architecture.md)에 기록한다.

## 1. 최신 인계 패킷

문서의 커밋 해시는 작성 직전 확인한 원격 기준이다. 문서를 포함한 최종 해시는 응답 패킷과 git log -1에서 확인한다.

```markdown
### [GEMINI_HANDOFF_PACKET]
- **Repository & Branch**: Recon987/AI-Coding (main)
- **Latest Pushed Commit**: 887ca68b46dba8792f0c944fa7e5f785f8baf97e - feat: refine first use and calendar through three-expert review (TASK-UX-03)
- **Completed Steps & Modified Files**: TASK-UX-03 세 분야 협의·교차 검토 완료. Briefing/Calendar/Office/main/ui/style, shared format·선언 및 model TXT 포맷, 날짜·UI·Electron 검사, README·검토 기록·캡처/측정·validation.
- **Changed Interfaces / Schema Diff**: 앱0.6.1 / 업무 자료v3 유지. formatDate(string|Date,{year?,weekday?}), formatClock, formatTime 추가. 로컬 날짜/24h 표기. 전 컬렉션이 비었을 때만 시작 안내. 저장·IPC 변경 없음.
- **Test Status**: npm test37/37, npm run test:desktop 통과. UI134검사/오류0/외부요청0. Windows Actions38844487365 소스·패키징된 EXE 스모크·설치형/portable 빌드 통과.
- **Remaining Work for Gemini**: 다음 TASK-CALENDAR-02. 실제 Windows 스크린리더·날짜 입력·절전·토스트 확인. 칩의 긴 제목은 tooltip/선택 목록 보완을 유지.
- **Modified Code Snippets (if uncommitted)**: 소스 모두 커밋·푸시 완료. 이번 후속 변경은 Windows 증빙·다운로드 문서만 갱신. 문서 해시는 작성 직전 원격 기준.
```

## 2. 다음 백로그 우선순위

1. **TASK-TRAY-01 완료**: 옵트인 상주·종료 보호·resume24h 점검·지속 이력. 실제PC 절전/토스트 확인은 필요.
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

양력 법정/대체 및2025~2035 음력 공휴일, recurrence/repeatUntil 선택필드, holidaysForYear/holidayName/expandEventOccurrences/calendarItems(range)/reminderItems(now)/briefing 연계를 유지한다. 원본 하나에서회차를파생한다. 기존v3누락필드에임의기본값을쓰지않는다. 기준선 c32d590 npm test22/22·desktop통과. 검토에서발견한400회원본탐색상한은TRAY에서요청구간점프로수정하고장기일간/주간/월말/윤일회귀검증을추가했다.

## TASK-TRAY-01 완료 증빙

소스 50f7836, Windows [검증 실행](https://github.com/Recon987/AI-Coding/actions/runs/38827813053), [v0.6.0 다운로드](https://github.com/Recon987/AI-Coding/actions/runs/38827813053/artifacts/12015459007). 상세 범위·위젯 대역·Linux native Tray 미실행 및 Windows 실제 Tray 검사 구분은 validation.md 참조. 실기기 절차는 windows-checklist.md에 있다.

## TASK-UX-03 협의 기록

[세 분야 제안·협의·보완·교차 승인·전후 화면](review-rounds/TASK-UX-03.md). 현재 스키마·기존 자료와 트레이를 유지했다. 사용자 요청은 이번 개선 루프를 실행하는 것이며, 백그라운드 자동 개선 서비스를 추가하지 않았다.

Windows 검증 소스 `887ca68`, [실행 성공](https://github.com/Recon987/AI-Coding/actions/runs/38844487365), [v0.6.1 설치형·portable](https://github.com/Recon987/AI-Coding/actions/runs/38844487365/artifacts/12023060736). 패키징된 EXE도 새 첫 사용·날짜·달력 및 기존 트레이 회귀를 통과했다.
