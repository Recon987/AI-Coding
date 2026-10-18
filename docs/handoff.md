# AI-Coding 작업 인계장 (`docs/handoff.md`)

**저장소**: `Recon987/AI-Coding` (병합 대상 `main`) · **검증 브랜치 앱/데이터 버전**: `0.7.0` / `v3` (`v1`/`v2` 자동 백업 후 전환, 기존 `v3` 무손실 호환)

이 문서는 **Codex·Gemini·Claude**가 `공원 업무 수첩 (Park Workdesk)` 작업을 주고받을 때 보는 저장소 전체 요약이다. **과제별 현재 상태는 `docs/tasks/<ID>.md` 카드가 유일한 원천**이며, `npm run board`로 현황판을 본다. 운영 절차는 [docs/orchestration/README.md](orchestration/README.md), 규칙은 [AGENTS.md](../AGENTS.md), 실행 증빙은 [docs/validation.md](validation.md), 아키텍처는 [docs/architecture.md](architecture.md)에 있다.

## 1. 최신 인계 패킷

문서의 커밋 해시는 작성 직전 확인한 원격 기준이다. 문서를 포함한 최종 해시는 응답 패킷과 git log -1에서 확인한다.

```markdown
### [GEMINI_HANDOFF_PACKET]
- **Repository & Branch**: Recon987/AI-Coding (작업 브랜치 claude/zen-cannon-wc1at4 / 병합 대상 main, PR Recon987/AI-Coding#1)
- **Task Card**: TASK-DATES-01 review(검증자 codex, 재개 위치는 카드). EDITOR-01·02는 Codex 보완·승인 후 Claude 통합 완료(eba443d). 다음: TASK-CALENDAR-04
- **Latest Pushed Commit**: aae6dd0 - wip(TASK-DATES-01): 카드 착수와 달력 화면 개편(CALENDAR-04) 분리 (이 문서를 포함한 최종 해시는 응답 패킷 참조)
- **Completed Steps & Modified Files**: shared/dates.mjs·dates.d.mts(신규), shared/model.mjs·office.mjs·forms.mjs, src/components/{Briefing,Office,Calendar,FormExport,Observations}.tsx, tests/dates.test.cjs(신규), tests/store.test.cjs·office.test.cjs 자료 시각. 한국어 기록 docs/work-log/2026-10-18-claude-2.md
- **Changed Interfaces / Schema Diff**: 데이터 v3 변경 없음. 새 모듈 shared/dates.mjs. office.validDate는 dates.validDateKey와 같은 함수. 읽기 검증: 시간대 표시 없는 시각의 반복 종료일은 적힌 날짜 기준(엄격), 있는 시각은 UTC 날짜-1일까지 허용
- **Test Status**: Linux Node 22: npm test 91/91(시간대 5종), npm run test:desktop 8개 진입점 통과, 화면 검사 142·실패 0, 업무 흐름 11/11
- **Remaining Work for Gemini**: Codex: DATES-01 검증. 사용자: PR #1 병합 승인, '추가/등록', 주말 합계, SCHEMA-01, 양식 질문, PR #3·#4·#5 정리
- **Modified Code Snippets (if uncommitted)**: 없음
```

## 2. 과제 현황

`npm run board`가 우선순위·담당·재개 위치를 출력한다. 백로그를 이 문서에 중복 기록하지 않는다. 기존 검증·회차·PANEL/POLISH 검토는 Claude 원 브랜치에 통합됐다. 최신 EDITOR-01·02는 Codex가9e2d719에서 검토하고 두 오류를 보완했다. 보완 소스f97aaf3의 Linux/Windows 소스·패키지 검증까지 완료했으며 PR #5를 두 편집 카드와 함께 통합한다. main 병합 전이므로 review 유지. 다음 후보는 TASK-DATES-01.

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
