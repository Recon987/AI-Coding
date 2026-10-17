---
id: TASK-DATA-01
title: 손상된 업무 파일에서 앱을 복구할 수 있게 하고 저장을 디스크에 확정
status: review
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends:
priority: P0
updated: 2026-10-16
---

## 배경
`workdesk.json`을 읽지 못하면 오류 창 후 종료한다(`desktop/main.cjs:29-37`). 복원 기능이 앱 안에 있어 사용자가 직접 파일을 고치지 않으면 다시 쓸 수 없다. 저장은 임시 파일→이름 바꾸기지만 `fsync`가 없어 정전·강제 종료 때 빈 파일이 남을 수 있다(`desktop/store.cjs:16-24`).

## 완료 조건
- [x] 저장 시 임시 파일 `fsync` 후 rename, 가능한 플랫폼에서 디렉터리 `fsync`
- [x] 정상 저장 직후 마지막 정상본(`workdesk.json.last-good`)을 원자적으로 갱신
- [x] 시작 시 읽기 실패하면 손상 파일을 `.corrupt-<시각>.json`으로 보존(덮지 않음)하고 "마지막 정상본 사용 / 백업 파일에서 복원 / 종료" 선택 제공
- [x] 어떤 선택에서도 손상 원본을 지우지 않음
- [x] 손상 파일·빈 파일·20MB 초과 파일 시작 회귀 테스트(store 단위 + 데스크톱 스모크)
- [x] `npm test`, `npm run test:desktop` 통과
- [ ] Windows Actions 통과 — main 대상 PR에서 확인(검증자)

## 범위 밖
암호화(TASK-SECURITY-01), 복원 보호본 정리(TASK-BACKUP-02), 데이터 형식 v3 변경.

## 진행 단계
- [x] 1. store.write에 fsync 및 last-good 갱신 + 단위 테스트
- [x] 2. 시작 실패 분기와 복구 선택(main.cjs) + 손상본 보존
- [x] 3. 데스크톱 스모크에 손상 파일 시나리오
- [x] 4. README·architecture·validation 갱신

## 재개 위치
Codex 검증: desktop/store.cjs durableReplace·write(keepLastGood), desktop/recovery.cjs openDataFile, main.cjs save/restore의 keepLastGood, tests/recovery.test.cjs, tests/desktop-recovery-smoke.cjs. Node 24에서 npm test·test:desktop 재실행, PR의 Windows Actions 확인.

## 테스트 상태
2026-10-16 Linux Node 22: `npm test` 47/47, `npm run test:desktop` 통과(복구 스모크 포함, 트레이 native 미실행). Windows Actions 미실행.

## 검증 기록


### Codex 검증 (2026-10-16)

기준73c938e 및 task/task-review-claude-01의 보완본 검토. 필수파일 읽기·주파일/보호본 실패 의미·정상파일 오분류·복구 재선택·주파일 누락 보완 후 승인. Node24 npm test70/70·전체test:desktop·UI142·업무흐름10/10 통과. 상세 재현/제약: [독립 검토 기록](../reviews/2026-10-16-codex-claude.md). main 미병합이므로 status는 review 유지.
