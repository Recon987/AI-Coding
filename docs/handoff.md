# AI-Coding 작업 인계장 (`docs/handoff.md`)

**저장소**: `Recon987/AI-Coding` (병합 대상 `main`) · **검증 브랜치 앱/데이터 버전**: `0.7.0` / `v3` (`v1`/`v2` 자동 백업 후 전환, 기존 `v3` 무손실 호환)

이 문서는 **Codex·Gemini·Claude**가 `공원 업무 수첩 (Park Workdesk)` 작업을 주고받을 때 보는 저장소 전체 요약이다. **과제별 현재 상태는 `docs/tasks/<ID>.md` 카드가 유일한 원천**이며, `npm run board`로 현황판을 본다. 운영 절차는 [docs/orchestration/README.md](orchestration/README.md), 규칙은 [AGENTS.md](../AGENTS.md), 실행 증빙은 [docs/validation.md](validation.md), 아키텍처는 [docs/architecture.md](architecture.md)에 있다.

## 1. 최신 인계 패킷

문서의 커밋 해시는 작성 직전 확인한 원격 기준이다. 문서를 포함한 최종 해시는 응답 패킷과 git log -1에서 확인한다.

```markdown
### [GEMINI_HANDOFF_PACKET]
- **Repository & Branch**: Recon987/AI-Coding (작업 브랜치 claude/zen-cannon-wc1at4 / 병합 대상 main, PR Recon987/AI-Coding#1). Codex의 task/task-review-claude-01(PR #2)·task/task-calendar-02(PR #3)를 fast-forward로 통합함
- **Task Card**: review 16장(ORCH-01 … CALENDAR-03, REVIEW-CLAUDE-01, CALENDAR-02) — 모두 검증자 승인 기록 있음, main 병합 시 done. FORMS-02 blocked(사용자 피드백), POLISH-01 backlog(Codex 비차단 후속)
- **Latest Pushed Commit**: 26e3e08 - docs: verify and integrate Codex review fixes and CALENDAR-02 (이 문서를 포함한 최종 해시는 응답 패킷 참조)
- **Completed Steps & Modified Files**: Claude가 Codex 수정(b03d6cf)·CALENDAR-02(a932812)를 직접 받아 검증·승인, docs/tasks/TASK-REVIEW-CLAUDE-01·CALENDAR-02 검증 기록, TASK-POLISH-01 신설
- **Changed Interfaces / Schema Diff**: 데이터 v3. Event.completedDates?/excludedDates?, store.read(file,{required}), write()가 보호본 실패 시 {warning} 반환, save IPC 응답 {warning}. 앱 표시 버전 0.7.0
- **Test Status**: Linux Node 22: npm test 81/81, npm run test:desktop 전체 통과(트레이 native 미실행), review:ui strict 142·외부 요청 0. Codex Node 24 동일 결과, Windows Actions 38896149700(b03d6cf)·38898226246(4a10c2c) 성공. 26e3e08은 PR #1에서 실행
- **Remaining Work for Gemini**: 사용자: PR #1 main 병합 승인, PR #2·#3 정리(내용은 PR #1에 포함), 양식 질문 4개·용어 피드백. 다음 후보: HOLIDAY-01, POLISH-01, SECURITY-01 설계
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
