# AI-Coding 작업 인계장 (`docs/handoff.md`)

**저장소**: `Recon987/AI-Coding` (병합 대상 `main`) · **검증 브랜치 앱/데이터 버전**: `0.7.0` / `v3` (`v1`/`v2` 자동 백업 후 전환, 기존 `v3` 무손실 호환)

이 문서는 **Codex·Gemini·Claude**가 `공원 업무 수첩 (Park Workdesk)` 작업을 주고받을 때 보는 저장소 전체 요약이다. **과제별 현재 상태는 `docs/tasks/<ID>.md` 카드가 유일한 원천**이며, `npm run board`로 현황판을 본다. 운영 절차는 [docs/orchestration/README.md](orchestration/README.md), 규칙은 [AGENTS.md](../AGENTS.md), 실행 증빙은 [docs/validation.md](validation.md), 아키텍처는 [docs/architecture.md](architecture.md)에 있다.

## 1. 최신 인계 패킷

문서의 커밋 해시는 작성 직전 확인한 원격 기준이다. 문서를 포함한 최종 해시는 응답 패킷과 git log -1에서 확인한다.

```markdown
### [GEMINI_HANDOFF_PACKET]
- **Repository & Branch**: Recon987/AI-Coding (task/task-review-dates-01 / 기준 Claude75f04e9 / main 미병합)
- **Task Card**: TASK-REVIEW-DATES-01 review. DATES-01 독립 검증 승인·월말P3/CI 신뢰성 보완. Claude PR #6 통합 대기.
- **Latest Pushed Commit**: 928e78e5113df5ab45d32d3c86ff6434a1d7cd3e - fix(TASK-REVIEW-DATES-01): Windows 검사 중간 실패 감지와 정리 재시도 (검증 소스, 최종 증빙 해시는 응답/git log)
- **Completed Steps & Modified Files**: shared/dates.mjs 월말 연도 보존·5TZ 회귀, workflow 종료 코드 가드·tray/desktop 정리 제한 재시도/원 오류 로깅, 카드·검토/검증/한국어 기록·README/architecture/handoff.
- **Changed Interfaces / Schema Diff**: 기존 함수 시그니처·자료v3·IPC 유지. periodRange의 허용한 낮은 연도 결과만 보완.
- **Test Status**: Node24 npm test91/91을5TZ 각각·test:desktop8진입점·UI142/오류0/외부요청0·흐름11/11. 독립 자료1800·현대경계2412·정상600·보완경계132 통과. 최종 Windows39110892545(928e78e) 소스/패키지 각 PASS·예외0 확인. 첫39110532993의 success는 전체 통과 증빙에서 제외.
- **Remaining Work for Gemini**: Claude는 DATES-01과 PR #6 보완/증빙을 함께 통합. 다음 CALENDAR-04. 기관 PC·정책 결정 별도.
- **Modified Code Snippets (if uncommitted)**: 없음(최종 증빙 문서만 이 기록과 즉시 커밋/푸시). 원 브랜치/main 직접 수정 없음.
```

## 2. 과제 현황

`npm run board`가 우선순위·담당·재개 위치를 출력한다. 백로그를 중복 기록하지 않는다. 기존 EDITOR-01·02 보완은 Claude 원 브랜치에 통합됐다. 최신 DATES-01도 Codex가 독립 검증했고 월말 경계/Windows 검사 신뢰성을 PR #6에서 보완했다. 최종928e78e의 Windows39110892545 소스/패키지 각 PASS 확인. 최초39110532993은 중간 실패가 덮인 실행이므로 전체 통과 증빙에서 제외한다. main 병합 전 review 유지, 다음 후보 CALENDAR-04.

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
