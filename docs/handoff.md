# AI-Coding 작업 인계장 (`docs/handoff.md`)

**저장소**: `Recon987/AI-Coding` (병합 대상 `main`) · **검증 브랜치 앱/데이터 버전**: `0.7.0` / `v3` (`v1`/`v2` 자동 백업 후 전환, 기존 `v3` 무손실 호환)

이 문서는 **Codex·Gemini·Claude**가 `공원 업무 수첩 (Park Workdesk)` 작업을 주고받을 때 보는 저장소 전체 요약이다. **과제별 현재 상태는 `docs/tasks/<ID>.md` 카드가 유일한 원천**이며, `npm run board`로 현황판을 본다. 운영 절차는 [docs/orchestration/README.md](orchestration/README.md), 규칙은 [AGENTS.md](../AGENTS.md), 실행 증빙은 [docs/validation.md](validation.md), 아키텍처는 [docs/architecture.md](architecture.md)에 있다.

## 1. 최신 인계 패킷

문서의 커밋 해시는 작성 직전 확인한 원격 기준이다. 문서를 포함한 최종 해시는 응답 패킷과 git log -1에서 확인한다.

```markdown
### [GEMINI_HANDOFF_PACKET]
- **Repository & Branch**: Recon987/AI-Coding (task/task-review-panel-01 / 기준 Claude ad40b18 / main 미병합)
- **Task Card**: TASK-REVIEW-PANEL-01 review. TASK-PANEL-01·POLISH-01은 Codex 독립 검증 승인. 총괄이 증빙을 통합.
- **Latest Pushed Commit**: 1773bae - wip(TASK-REVIEW-PANEL-01): Claude 최신 개선 검증 착수 (작성 직전 원격, 최종 해시는 응답/git log)
- **Completed Steps & Modified Files**: 두 원 카드·기존 통합 카드 재개 위치, 검토 기록·검증·한국어 작업 기록·README·화면 증빙. task-flows의 오래된 해설 정정. 앱 코드는 ad40b18과 동일.
- **Changed Interfaces / Schema Diff**: 이번 검증 변경 없음. 기존 v3·IPC·오프라인/격리 유지.
- **Test Status**: Node24 npm test89/89·test:desktop7진입점·UI142/오류0/외부요청0·흐름11/11. 독립 자료33·모델17·정상자료600시간대조합 통과. 동일 소스 Windows39102593618 성공·각 PASS 확인.
- **Remaining Work for Gemini**: Claude가 검증 증빙 PR 통합 및 원 PR #1 병합 절차 진행. PR #2 병합됨, #3 내용도 원본 포함(열린 상태 정리). 다음 후보 EDITOR-01. 기관 PC·스키마/암호화·서식 결정 별도.
- **Modified Code Snippets (if uncommitted)**: 검증 증빙과 해설 수정은 즉시 커밋·푸시. 앱 실행 코드 변경 없음.
```

## 2. 과제 현황

`npm run board`가 우선순위·담당·재개 위치를 출력한다. 이 문서에 백로그를 복제하지 않는다. 2026-10-18: 기존 검증·회차 관리는 Claude 원 브랜치에 통합됐다(PR #2 병합, PR #3 내용 포함). Claude의 POLISH-01·PANEL-01도 Codex가 ad40b18에서 독립 검증 승인했다. main 병합 전이므로 review 상태 유지. 최신 재개 위치는 TASK-REVIEW-PANEL-01 및 두 원 카드 참조.

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
