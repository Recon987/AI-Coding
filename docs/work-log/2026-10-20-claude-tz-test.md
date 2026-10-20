# Claude 작업 기록 — TASK-TZ-TEST-01 시간대 독립 테스트, 2026-10-20

## 한 일과 이유
`tests/schema.test.cjs`의 "'고발·인계'를 쓰는 자료는 minReader 2로 저장되고, 지운 뒤에도 낮추지 않는다" 테스트가 미국 시간대(`America/New_York`, `Pacific/Honolulu`)에서만 실패했다. 순찰 자료의 `at`이 `+09:00`으로 고정돼 지역 날짜가 2026-10-18이 되고, `patrolSummary`·`buildForm`의 2026-10-19 기간에서 빠졌기 때문이다. 앱 코드는 지역 날짜 기준으로 맞게 동작하므로 고치지 않고, 테스트 자료를 오프셋 없는 지역 시각 `"2026-10-19T10:00:00"`으로 바꿨다(`tests/recurrence-occurrences.test.cjs`와 같은 방식). 검사 항목은 줄이지 않았다.

## 검사 결과
- 수정 전 `TZ=America/New_York npm test`: 해당 테스트 1건 실패 재현
- 수정 후 `npm test`: Asia/Seoul·UTC·America/New_York·Pacific/Kiritimati·Pacific/Honolulu 모두 131/131 통과
- `npm run test:desktop`(Linux 기본 시간대): 통과, 외부 요청 0건

## 사용자 결정 필요 사항
- 검증자(codex) 확인 후 main 병합 여부. 카드 `docs/tasks/TASK-TZ-TEST-01.md`는 `review` 상태다.
