---
id: TASK-BACKUP-02
title: 복원 보호본 보관 개수 제한
status: review
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
구현 완료, Codex 검증 대기.

## 구현 내용·검증 요점
- `desktop/store.cjs`: `RESTORE_KEEP = 5`, `restoreCopies(file)`(이름이 정확히 `<파일>.before-restore-<숫자>.json`인 것만, 숫자 = 시각 순), `restoreCopyPath(file, now)`(같은 시각이면 다음 숫자), `pruneRestoreCopies(file, keep)`(오래된 것부터 지우고, 지우지 못한 파일은 throw 없이 보고).
- `desktop/main.cjs` restore: 확인창 `detail`에 "최근 5개만 보관"과, 이번 복원으로 지워질 보호본 개수·날짜를 **복원 전에** 표시. 순서: 새 보호본 쓰기 → 복원 저장 → 정리. 정리 실패는 복원 실패가 아니라 화면 경고(보호본 경고와 합쳐 1회).
- 정리 대상 아님: v1/v2 전환 백업, 손상본(`.corrupt-…`), `.last-good`, 사용자가 만든 백업, 이름 규칙이 다른 파일.
- 앱 안내 문구·README 갱신. 새 IPC 없음.

## 테스트 상태
2026-10-19 Linux(Node 22): `npm test` 116/116(새 backup-retention 2개: 7개 중 오래된 2개만 정리·다른 파일 보존·이름 충돌·삭제 실패 보고), `npm run test:desktop` 12개 진입점(desktop-notice-smoke에 실제 복원: 확인창 안내·5개 유지·가장 오래된 것만 정리·새 보호본 = 복원 전 자료, LA 시간대에서도 통과), 화면 검사 150개 실패 0·외부 요청 0, 업무 과업 11/11. Windows 수동 실행 [39230668333](https://github.com/Recon987/AI-Coding/actions/runs/39230668333)(20cdc3c) 성공.

## 검증 기록
