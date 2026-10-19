# AI-Coding 작업 인계장 (`docs/handoff.md`)

**저장소**: `Recon987/AI-Coding` (병합 대상 `main`) · **검증 브랜치 앱/데이터 버전**: `0.8.0` / `v3` (`v1`/`v2` 자동 백업 후 전환, 기존 `v3` 무손실 호환)

이 문서는 **Codex·Gemini·Claude**가 `공원 업무 수첩 (Park Workdesk)` 작업을 주고받을 때 보는 저장소 전체 요약이다. **과제별 현재 상태는 `docs/tasks/<ID>.md` 카드가 유일한 원천**이며, `npm run board`로 현황판을 본다. 운영 절차는 [docs/orchestration/README.md](orchestration/README.md), 규칙은 [AGENTS.md](../AGENTS.md), 실행 증빙은 [docs/validation.md](validation.md), 아키텍처는 [docs/architecture.md](architecture.md)에 있다.

## 1. 최신 인계 패킷

문서의 커밋 해시는 작성 직전 확인한 원격 기준이다. 문서를 포함한 최종 해시는 응답 패킷과 git log -1에서 확인한다.

```markdown
### [GEMINI_HANDOFF_PACKET]
- **Repository & Branch**: Recon987/AI-Coding (작업 브랜치 claude/zen-cannon-wc1at4 / 병합 대상 main). main은 1eb40aa(PR #13, Windows 39261191057 성공)
- **Task Card**: TASK-AXDESK-01 review(검증자 codex, MODULES-02 의존 예외). TASK-MODULES-01·02 review(Windows 39261289803·39263527042 성공). 다음 TASK-AXDESK-02 → 03. BK-01·HL-01 Codex 사후 재검증 대기
- **Latest Pushed Commit**: e6fd498(AXDESK-01 구현, Windows 39264945738 성공) (이 문서를 포함한 최종 해시는 응답 패킷 참조)
- **Completed Steps & Modified Files**: src/components/AxDesk.tsx(사업 목록·편집·집행률), shared/ax.mjs(milestoneItems·milestoneTitle +d.mts), shared/model.mjs(calendarItems에 AX 파생, briefing AX 구역), shared/search.mjs(ax +d.mts), shared/labels.mjs(TARGET.axProject +d.mts), src/ui.tsx(종일·ax 색), ListRow(머리글 이름), calendar/MonthGrid(범례), Briefing(AX 건수), style.css, tests/ax-desk.test.cjs·desktop-axdesk-smoke.cjs(신규), package.json·windows-build.yml
- **Changed Interfaces / Schema Diff**: 자료 형식 변경 없음(MODULES-01의 axProjects 사용). 달력 항목 분류 "AX"(key `ax:<id>`, page "ax", 종일). 브리핑 문구에 "AX 사업 마일스톤 (n)" 구역(그날 있을 때만). IPC 변경 없음
- **Test Status**: Linux Node 22: npm test 147/147, npm run test:desktop 14개 진입점 + 감사 9/9, 화면 150·실패 0, 업무 과업 11/11. Windows 39264945738(e6fd498) 성공
- **Remaining Work for Gemini**: Codex: MODULES-01·02·AXDESK-01 검증, BK-01·HL-01 재검증. 사용자: "마지막 화면 기억", "브리핑에 이번 주 마일스톤·마일스톤 알림" 여부. Claude: AXDESK-02
- **Modified Code Snippets (if uncommitted)**: 없음
```

## 2. 과제 현황

**2026-10-19 두 번째 main 병합**: 7주기 카드 6장(SCHEMA-01·BRIEF-02·LABELS-01·FORMS-02·HOLIDAY-01·BACKUP-02)과 Codex 자료 안전 감사(PR #10·#11)를 사용자 승인으로 병합. BK-01·HL-01 보완의 Codex 독립 재검증은 병합 뒤에 받는다. 다음 작업은 TASK-ARCH-MODULAR-01([보정 명세](specs/modular-ax/implementation.md)).

**2026-10-19 main 병합**: PR #1(검증 끝난 카드 29장)을 main에 병합했다. 사용자 결정 7건(Claude 추천 위임)은 [작업 기록 14장](work-log/2026-10-18-claude-2.md)과 각 카드에 있다. 아래 문단은 병합 전 기록이다.

`npm run board`가 우선순위·담당·재개 위치를 출력한다. 백로그를 중복 기록하지 않는다. 기존 EDITOR-01·02 보완은 Claude 원 브랜치에 통합됐다. 최신 DATES-01도 Codex가 독립 검증했고 월말 경계/Windows 검사 신뢰성을 PR #6에서 보완했다. 최종928e78e의 Windows39110892545 소스/패키지 각 PASS 확인. 최초39110532993은 중간 실패가 덮인 실행이므로 전체 통과 증빙에서 제외한다. main 병합 전 review 유지. 후속 CALENDAR-04는 Codex가 PR #7에서 구현·Linux/Windows 자동 검사를 마쳐 Claude 독립 검증 대기다.

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

## DATES-01 최종 검증

소스928e78e, [PR #6](https://github.com/Recon987/AI-Coding/pull/6), [Windows 성공](https://github.com/Recon987/AI-Coding/actions/runs/39110892545), [설치형·portable](https://github.com/Recon987/AI-Coding/actions/runs/39110892545/artifacts/12129919918). [독립 검토·검사 신뢰성 보완](reviews/2026-10-18-codex-dates.md), [한국어 작업 기록](work-log/2026-10-18-codex-dates.md).

## CALENDAR-04 검증 요청

최종 소스86bd62c, [PR #7](https://github.com/Recon987/AI-Coding/pull/7), [Windows39128793988](https://github.com/Recon987/AI-Coding/actions/runs/39128793988), [v0.8.0 설치형·portable](https://github.com/Recon987/AI-Coding/actions/runs/39128793988/artifacts/12136379775). [초기 협의·직접 검사·전후 화면·독립 검증 상태](reviews/2026-10-18-codex-calendar04.md), [한국어 작업 기록](work-log/2026-10-18-codex-calendar04.md). Claude가 #7→#6→#1 순서로 검증·통합하며 main 병합 전 review를 유지한다.


## LIST-02 독립 검증·폭 경계 보완

[PR #9](https://github.com/Recon987/AI-Coding/pull/9), 실행 소스986910a, [Windows39185832387](https://github.com/Recon987/AI-Coding/actions/runs/39185832387) 성공, [시험 빌드](https://github.com/Recon987/AI-Coding/actions/runs/39185832387/artifacts/12157753983). 1101px 순찰 제목0px 결함을 보완했고1280px 행67px은 유지했다. [발견·검사·전후 화면](reviews/2026-10-19-codex-list02.md), [작업 기록](work-log/2026-10-19-codex-list02.md). Claude의 교차 검증 후 통합하며 main은 미병합이다.

## A11Y-02 복구·검증 결과 보존

환경 복구 후 기존 미푸시 변경을 별도 보관하고 Claude의 동등 수정·타이머 경합 보완을 검증했다. 추가 알림 재진입 포커스 문제는 [PR #8](https://github.com/Recon987/AI-Coding/pull/8) 실행746b478·최종 문서788071a에 보존했다. Linux 단위91·desktop10·UI150·흐름11, Windows39184848329 소스10/패키지9 모두 통과했다. 환경 오류로 검증 중단이라는 이전 기록을 대체한다. 이 LIST 브랜치는 PR #8을 포함하지 않으므로 총괄이 두 결과를 각각 통합한다.


## DS-01 재감사·후속6카드 독립 검증(2026-10-19)

DS-01은 afc3825에서 승인됐다. 자료 안전성 **감사 카드**는 사용자 요청대로done이다. 제품6카드는4승인·2반려로 전체 main 병합은 보류한다. [최종 검토](reviews/2026-10-19-codex-dispatch.md). BK-01은 시계 역행 때 새 복원 직전 보호본을 즉시 지우는 P1, HL-01은 공휴일 한도 초과 시 화면 안내 없는 미처리 예외 P2다. Claude가 BACKUP-02 진행 중 → HOLIDAY-01 ready 순으로 보완한다. 기존 자동 검사 성공은 이 새 경계 실패를 포함하지 않는다.
