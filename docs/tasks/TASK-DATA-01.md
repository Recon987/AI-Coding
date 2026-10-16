---
id: TASK-DATA-01
title: 손상된 업무 파일에서 앱을 복구할 수 있게 하고 저장을 디스크에 확정
status: in-progress
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
- [ ] 저장 시 임시 파일 `fsync` 후 rename, 가능한 플랫폼에서 디렉터리 `fsync`
- [ ] 정상 저장 직후 마지막 정상본(`workdesk.json.last-good`)을 원자적으로 갱신
- [ ] 시작 시 읽기 실패하면 손상 파일을 `.corrupt-<시각>.json`으로 보존(덮지 않음)하고 "마지막 정상본 사용 / 백업 파일에서 복원 / 종료" 선택 제공
- [ ] 어떤 선택에서도 손상 원본을 지우지 않음
- [ ] 손상 파일·빈 파일·20MB 초과 파일 시작 회귀 테스트(store 단위 + 데스크톱 스모크)
- [ ] `npm test`, `npm run test:desktop` 통과, Windows Actions 통과

## 범위 밖
암호화(TASK-SECURITY-01), 복원 보호본 정리(TASK-BACKUP-02), 데이터 형식 v3 변경.

## 진행 단계
- [x] 1. store.write에 fsync 및 last-good 갱신 + 단위 테스트
- [x] 2. 시작 실패 분기와 복구 선택(main.cjs) + 손상본 보존
- [ ] 3. 데스크톱 스모크에 손상 파일 시나리오
- [ ] 4. README·architecture·validation 갱신

## 재개 위치
3단계: tests/desktop-smoke.cjs(또는 별도 스모크)에 손상 파일로 실제 Electron 시작 → 복구 대화상자 → 마지막 정상본 시작 시나리오. 시작 전 대화상자는 app.evaluate로 대체할 수 없으므로 NODE_OPTIONS=--require 스텁 방식 검토. 구현: desktop/recovery.cjs openDataFile, desktop/store.cjs durableReplace·write(keepLastGood).

## 테스트 상태
2026-10-16 Linux Node 22: `npm test` 통과(recovery.test.cjs 7개 추가). 데스크톱 스모크 미실행.

## 검증 기록
