# AI-Coding 작업 인계장 (`docs/handoff.md`)

**저장소**: `Recon987/AI-Coding` (병합 대상 `main`) · **검증 브랜치 앱/데이터 버전**: `0.7.0` / `v3` (`v1`/`v2` 자동 백업 후 전환, 기존 `v3` 무손실 호환)

이 문서는 **Codex·Gemini·Claude**가 `공원 업무 수첩 (Park Workdesk)` 작업을 주고받을 때 보는 저장소 전체 요약이다. **과제별 현재 상태는 `docs/tasks/<ID>.md` 카드가 유일한 원천**이며, `npm run board`로 현황판을 본다. 운영 절차는 [docs/orchestration/README.md](orchestration/README.md), 규칙은 [AGENTS.md](../AGENTS.md), 실행 증빙은 [docs/validation.md](validation.md), 아키텍처는 [docs/architecture.md](architecture.md)에 있다.

## 1. 최신 인계 패킷

문서의 커밋 해시는 작성 직전 확인한 원격 기준이다. 문서를 포함한 최종 해시는 응답 패킷과 git log -1에서 확인한다.

```markdown
### [GEMINI_HANDOFF_PACKET]
- **Repository & Branch**: Recon987/AI-Coding (작업 브랜치 claude/zen-cannon-wc1at4 / 병합 대상 main, PR Recon987/AI-Coding#1)
- **Task Card**: TASK-PANEL-01 review(검증자 codex) — 5개 역할 교차 검토 5주기. TASK-POLISH-01 review(codex). 그 외 review 16장 승인 기록 있음. 다음 주기 backlog: EDITOR-01(P1)·SCHEMA-01(P1, 사용자 승인 필요)·DATES-01·LABELS-01·A11Y-02·LIST-02
- **Latest Pushed Commit**: 12e7b62 - fix(TASK-PANEL-01): code-review fixes (이 문서를 포함한 최종 해시는 응답 패킷 참조)
- **Completed Steps & Modified Files**: [검토 문서](reviews/2026-10-18-panel.md) 1차 40건·2차 교차·합의·3차 재검토. 구현: shared/model.mjs(utcDayBefore, briefing 근무·당직/전날 단속, patrolAutoTitle, newPatrolDraft), shared/search.mjs(신규), desktop/store.cjs(withRetry·isTransientLock·retry, 백업 새 이름), desktop/recovery.cjs(잠금 다시 시도, 단일 읽기 경로), src/components/{ListRow,Office,Patrols,Personal,Calendar,Tasks}.tsx, src/main.tsx, src/style.css, tests(search·recovery·recurrence-timezone·office·patrol-observations·store·desktop-list/smoke/confirm·task-flows T2c)
- **Changed Interfaces / Schema Diff**: 데이터 v3 변경 없음. 읽기 검증의 반복 종료일은 시작 UTC 날짜-1일까지 허용(편집기는 지역 날짜 엄격). store 모듈 export에 isTransientLock·retry 추가. 메모·일정 편집이 모르는 필드를 보존. 브리핑 TXT에 '근무·당직'(당직자 이름만)·'전날 단속·확인' 절 추가
- **Test Status**: Linux Node 22: npm test 89/89, npm run test:desktop 8개 통과, review:flows 11개 완료, review:ui strict+zoom 142·실패 0. Windows Actions는 PR #1 최신 head에서 확인 필요(32ad74f 실패는 547d746에서 수정)
- **Remaining Work for Gemini**: Codex: PANEL-01·POLISH-01 검증. 사용자: PR #1 main 병합 승인, '추가/등록' 용어, 월요일 브리핑 주말 합계 여부, SCHEMA-01(minReader) 승인, 양식 질문 4개
- **Modified Code Snippets (if uncommitted)**: 없음
```

## 2. 과제 현황

`npm run board`가 우선순위·담당·재개 위치를 출력한다. 이 문서에 백로그를 따로 적지 않는다(이중 기록 금지). 2026-10-16: Claude의14개 review 카드를 Codex가 검증했다. 원본에서 누락된 오류 경로는 TASK-REVIEW-CLAUDE-01에서 보완했으며 총괄 통합 전 상태를 유지한다. 후속 TASK-CALENDAR-02도 구현·교차검토·Windows 소스/패키지 검증을 마쳐 review다. PR #3 → #2 → #1 순으로 통합한다. 이후 순서는 보드와 해당 카드의 재개 위치를 따른다.

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
