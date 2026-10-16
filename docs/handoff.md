# AI-Coding 작업 인계장 (`docs/handoff.md`)

**저장소**: `Recon987/AI-Coding` (병합 대상 `main`) · **앱/데이터 버전**: `0.6.1` / `v3` (`v1`/`v2` 자동 백업 후 전환, 기존 `v3` 무손실 호환)

이 문서는 **Codex·Gemini·Claude**가 `공원 업무 수첩 (Park Workdesk)` 작업을 주고받을 때 보는 저장소 전체 요약이다. **과제별 현재 상태는 `docs/tasks/<ID>.md` 카드가 유일한 원천**이며, `npm run board`로 현황판을 본다. 운영 절차는 [docs/orchestration/README.md](orchestration/README.md), 규칙은 [AGENTS.md](../AGENTS.md), 실행 증빙은 [docs/validation.md](validation.md), 아키텍처는 [docs/architecture.md](architecture.md)에 있다.

## 1. 최신 인계 패킷

문서의 커밋 해시는 작성 직전 확인한 원격 기준이다. 문서를 포함한 최종 해시는 응답 패킷과 git log -1에서 확인한다.

```markdown
### [GEMINI_HANDOFF_PACKET]
- **Repository & Branch**: Recon987/AI-Coding (작업 브랜치 claude/zen-cannon-wc1at4 / 병합 대상 main, PR Recon987/AI-Coding#1 열림·미병합)
- **Task Card**: review 12장 — ORCH-01, REVIEW-DOMAIN/DESIGN/UX-01, DATA-01, CONFIRM-01, DESIGN-TOKENS-01, PATROL-02, CONTROL-01, FORMS-01, LIST-01, HOME-02. FORMS-02 blocked(사용자 피드백). 재개 위치는 각 카드
- **Latest Pushed Commit**: e8e4951 - feat: scannable record rows with one primary action per screen (TASK-LIST-01) (이 문서를 포함한 최종 해시는 응답 패킷 참조)
- **Completed Steps & Modified Files**: 3주기: src/components/ListRow.tsx, Patrols·Tasks·Personal·Controls 목록, Briefing.tsx 상태 띠·주 단위 이동, style.css, tests/desktop-list-smoke.cjs, task-flows T1. 이전 주기 내역은 카드와 git log
- **Changed Interfaces / Schema Diff**: 데이터 v3 유지(이번 주기 자료 변경 없음). 홈의 '브리핑 날짜' 입력칸·하루 이동 버튼 제거(주간 띠·이전 주/다음 주로 대체). 목록 행 구조 변경(.record/.record-details/h3 유지)
- **Test Status**: Linux Node 22: npm test 64/64(TZ=UTC 포함), npm run test:desktop 통과(스모크 6종, 트레이 native 미실행), review:ui strict 134·첫 업무 행 293px, review:flows 10/10. Windows Actions는 이 커밋 푸시 후 PR에서 실행
- **Remaining Work for Gemini**: (웹) 디자인 2차 의견 — docs/ui-review/cycle2 전후 캡처 활용. Codex: 카드 12장 검증 → main 병합. 사용자: 양식 질문 4개, 화면 용어 피드백, 다음 주기 승인(NAV-01, CALENDAR-03 후보)
- **Modified Code Snippets (if uncommitted)**: 없음
```

## 2. 과제 현황

`npm run board`가 우선순위·담당·재개 위치를 출력한다. 이 문서에 백로그를 따로 적지 않는다(이중 기록 금지). 2026-10-16 기준 요약: P0 TASK-DATA-01(손상 파일 복구), P1 도메인·디자인·UX 검토 3건이 `ready`이며 기능 백로그(CALENDAR-02, SECURITY-01, HOLIDAY-01, BACKUP-02, LAW-01, LEDGER-01)는 검토 결과에 따라 재정렬한다.

## 3. 작업 시작·종료

[운영 절차 4~5장](orchestration/README.md#4-작업-순서-한-과제)을 따른다. 요약: `git fetch` → `npm run board` → 자기 `in-progress` 카드의 재개 위치부터 → 단계마다 체크포인트 푸시 → `review` → 다른 에이전트 검증 → 총괄이 `main` 병합.

## 보존한 Gemini TASK-CALENDAR-01

양력 법정/대체 및2025~2035 음력 공휴일, recurrence/repeatUntil 선택필드, holidaysForYear/holidayName/expandEventOccurrences/calendarItems(range)/reminderItems(now)/briefing 연계를 유지한다. 원본 하나에서회차를파생한다. 기존v3누락필드에임의기본값을쓰지않는다. 기준선 c32d590 npm test22/22·desktop통과. 검토에서발견한400회원본탐색상한은TRAY에서요청구간점프로수정하고장기일간/주간/월말/윤일회귀검증을추가했다.

## TASK-TRAY-01 완료 증빙

소스 50f7836, Windows [검증 실행](https://github.com/Recon987/AI-Coding/actions/runs/38827813053), [v0.6.0 다운로드](https://github.com/Recon987/AI-Coding/actions/runs/38827813053/artifacts/12015459007). 상세 범위·위젯 대역·Linux native Tray 미실행 및 Windows 실제 Tray 검사 구분은 validation.md 참조. 실기기 절차는 windows-checklist.md에 있다.

## TASK-UX-03 협의 기록

[세 분야 제안·협의·보완·교차 승인·전후 화면](review-rounds/TASK-UX-03.md). 현재 스키마·기존 자료와 트레이를 유지했다. 사용자 요청은 이번 개선 루프를 실행하는 것이며, 백그라운드 자동 개선 서비스를 추가하지 않았다.

Windows 검증 소스 `887ca68`, [실행 성공](https://github.com/Recon987/AI-Coding/actions/runs/38844487365), [v0.6.1 설치형·portable](https://github.com/Recon987/AI-Coding/actions/runs/38844487365/artifacts/12023060736). 패키징된 EXE도 새 첫 사용·날짜·달력 및 기존 트레이 회귀를 통과했다.
