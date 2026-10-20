---
id: TASK-SECURITY-03
title: 백업 암호(scrypt)로 이동 백업 봉함·복원
status: in-progress
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends: TASK-SECURITY-02
priority: P1
updated: 2026-10-20
---

## 배경
- 의존 예외: TASK-SECURITY-02 (사용자 승인 2026-10-20, "이어서 SECURITY-03 진행해" — 구현 끝, Codex 검증 대기)

[설계안](../research/security-01-design.md) 5장·10장: 백업·복원할 때마다 백업 암호 입력(PC에 저장하지 않음).

## 완료 조건
- [ ] 백업 내보내기: 암호 두 번 입력, scrypt(N=2^17, r=8, p=1) → AES-256-GCM 봉함, 암호 강도 안내
- [ ] 복원: 봉한 백업은 암호 입력(틀리면 원본 불변·재시도), 기존 평문 백업은 계속 읽기
- [ ] 변조·암호 틀림·잘린 파일에서 기존 자료 보존, 복원 보호본 규칙 유지
- [ ] `npm test`, `npm run test:desktop`, Windows Actions 통과

## 범위 밖
저장 파일 봉함(SECURITY-02).

## 진행 단계
- [x] 1. 백업 봉투·키 유도 순수 함수와 단위 검사 (`desktop/backup-seal.cjs`, `shared/backup-password.mjs`, `store.readBackup/writeBackup`, `tests/backup-seal.test.cjs` 8건)
- [ ] 2. 백업·복원 대화상자 연결·실제 앱 검사·기록

## 재개 위치
2단계: `desktop/main.cjs` IPC `backup(password)`·`restore()`(결과 `{data}`/`{needsPassword,name}`/null)·`restore-password(password)`·`restore-cancel`, 시작 복구 흐름(`recovery.cjs`)의 암호 백업 선택 시 암호 창, `src/components/BackupSheet.tsx`(백업 암호 두 번·강도 안내, 복원 암호 입력), 기존 스모크(`desktop-smoke`·`desktop-recurrence-smoke`)의 백업 단계를 암호 입력으로 갱신, `tests/desktop-backup-password-smoke.cjs`.

## 테스트 상태
2026-10-20 1단계: `npm test` 196/196 통과(backup-seal 8건 포함, 실제 비용 N=2^17 1건). `test:desktop` 미실행.

## 구현 결정
- 봉투 `{version:3, minReader:3, backupSealed:{format:"park-workdesk-backup", version:1, kdf:"scrypt", N, r, p, salt, alg:"AES-256-GCM", iv, tag, data}}`. 저장 봉투(`sealed`)와 키 이름을 달리해 어느 쪽인지 섞이지 않는다.
- 파일에 적힌 비용은 N 2^14~2^18, r 1~8, p 1~4만 받는다(조작된 파일이 메모리 수 GB를 요구하지 못하게).
- 암호는 NFC로 정규화한다(같은 한글 암호를 다른 PC에서 입력해도 열림). 규칙: 10~256자, 서로 다른 글자 4개 이상. 강도 안내(약함/보통/강함)는 참고용이다.
- 일반 읽기(`store.read`: 시작·last-good·보호본)는 암호 백업을 열지 않는다(`BACKUP_PASSWORD_REQUIRED`).

## 검증 기록
