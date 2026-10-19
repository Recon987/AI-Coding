---
id: TASK-BACKUP-02
title: 복원 보호본 보관 개수 제한
status: in-progress
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends: TASK-DATA-01
priority: P2
updated: 2026-10-19
---

## 배경
복원할 때마다 `.before-restore-<시각>.json`이 생기고 지워지지 않는다(`desktop/main.cjs:91`). 평문 개인정보가 계속 쌓인다.

## 착수
2026-10-19 사용자 요청("이어서 BACKUP-02 진행해")으로 backlog에서 바로 착수. 보관 개수 기본 5는 카드 원안(사용자가 결정을 Claude 추천에 위임, 2026-10-19).

## 완료 조건
- [x] 최근 N개(기본 5)만 유지, 오래된 것부터 정리하되 정리 전 사용자 안내
- [x] v1/v2 전환 백업·손상본은 정리 대상 아님
- [x] 회귀 테스트

## 범위 밖
암호화.

## 진행 단계
- [x] 1. 정책·구현
- [x] 2. 테스트·문서

## 재개 위치
Codex 검증 반려(BK-01, P1): 미래 시각의 기존 보호본이 있을 때 새 복원 직전 보호본을 정리 과정에서 지운다. desktop/store.cjs restoreCopyPath·pruneRestoreCopies와 main.cjs의 사전 삭제 안내가 동일한 보존/삭제 대상을 선택하도록 보완한다. tests/desktop-backup-clock-audit.cjs의 정상/시계 역행2경로를 통과시킨 뒤 재검증한다.

## 구현 내용·검증 요점
- `desktop/store.cjs`: `RESTORE_KEEP = 5`, `restoreCopies(file)`(이름이 정확히 `<파일>.before-restore-<숫자>.json`인 것만, 숫자 = 시각 순), `restoreCopyPath(file, now)`(같은 시각이면 다음 숫자), `pruneRestoreCopies(file, keep)`(오래된 것부터 지우고, 지우지 못한 파일은 throw 없이 보고).
- `desktop/main.cjs` restore: 확인창 `detail`에 "최근 5개만 보관"과, 이번 복원으로 지워질 보호본 개수·날짜를 **복원 전에** 표시. 순서: 새 보호본 쓰기 → 복원 저장 → 정리. 정리 실패는 복원 실패가 아니라 화면 경고(보호본 경고와 합쳐 1회).
- 정리 대상 아님: v1/v2 전환 백업, 손상본(`.corrupt-…`), `.last-good`, 사용자가 만든 백업, 이름 규칙이 다른 파일.
- 앱 안내 문구·README 갱신. 새 IPC 없음.

## 테스트 상태
2026-10-19 Linux(Node 22): `npm test` 116/116(새 backup-retention 2개: 7개 중 오래된 2개만 정리·다른 파일 보존·이름 충돌·삭제 실패 보고), `npm run test:desktop` 12개 진입점(desktop-notice-smoke에 실제 복원: 확인창 안내·5개 유지·가장 오래된 것만 정리·새 보호본 = 복원 전 자료, LA 시간대에서도 통과), 화면 검사 150개 실패 0·외부 요청 0, 업무 과업 11/11. Windows 수동 실행 [39230668333](https://github.com/Recon987/AI-Coding/actions/runs/39230668333)(20cdc3c) 성공.

## 검증 기록

### 2026-10-19 Codex 감사 DS-01 보완 (Claude)
Codex 자료 안전성 감사(PR #10)가 이 카드의 결함을 찾았다: 복원 확정 뒤 보호본 정리 단계의 목록 읽기 오류가 예외로 올라가 화면이 복원 전 자료로 남고, 다음 저장이 복원을 되돌렸다. `desktop/main.cjs` 정리 단계를 경고로 바꾸고 `src/main.tsx`가 복원 실패 시 디스크를 다시 읽도록 고쳤다. 감사 검사를 정식 검사에 편입. Windows 39232674307(afc3825) 성공. 상세는 TASK-REVIEW-DATA-SAFETY-01 검증 기록.

### 2026-10-19 Codex 독립 검증 — DS-01 승인 / BK-01(P1) 반려
DS-01은 afc3825에서 Linux·Windows 소스/패키지 감사5/5로 해소됨을 확인했다. 다만 별도 검증에서 PC 시계를 되돌려 기존 보호본5개의 파일명 시각이 현재보다 미래인 상황이면, 이번 복원 직전 보호본이 가장 작은 시각으로 생성되어 pruneRestoreCopies가 즉시 삭제한다. 주파일·last-good는 복원본으로 바뀌고 현재 복원 직전 자료는 어느 보호본에도 남지 않는다. 확인창은 기존 미래 보호본1개를 지운다고 안내하지만 실제로는 방금 만든 보호본을 지우므로 안내와 실제 삭제 대상도 다르다. 정상 과거 보호본 대조는 통과, 미래 시각 조건은 실패(독립 실제 앱1/2). OS 시계는 바꾸지 않고 임시 가상 파일 이름으로 재현했다. [결과](../ui-review/dispatch-20261019/backup-clock.json).

수정 조건: 이번 복원 직전 보호본은 항상 남기고, 오래된 보호본 중 정리할 대상을 사전 안내와 일치시킨다. 시간 역행·이름 충돌·정리 실패에서도 원본 보호와 최근5개 정책을 함께 검증한다. 제품 코드는 Codex가 수정하지 않았다.

- [ ] BK-01: 시계 역행에서도 이번 복원 직전 보호본 보존·안내한 기존 보호본만 정리
