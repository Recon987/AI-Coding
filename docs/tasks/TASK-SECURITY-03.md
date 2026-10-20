---
id: TASK-SECURITY-03
title: 백업 암호(scrypt)로 이동 백업 봉함·복원
status: review
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
- [x] 백업 내보내기: 암호 두 번 입력, scrypt(N=2^17, r=8, p=1) → AES-256-GCM 봉함, 암호 강도 안내
- [x] 복원: 봉한 백업은 암호 입력(틀리면 원본 불변·재시도), 기존 평문 백업은 계속 읽기
- [x] 변조·암호 틀림·잘린 파일에서 기존 자료 보존, 복원 보호본 규칙 유지
- [x] `npm test`, `npm run test:desktop`, Windows Actions 통과

## 범위 밖
저장 파일 봉함(SECURITY-02).

## 진행 단계
- [x] 1. 백업 봉투·키 유도 순수 함수와 단위 검사 (`desktop/backup-seal.cjs`, `shared/backup-password.mjs`, `store.readBackup/writeBackup`, `tests/backup-seal.test.cjs` 8건)
- [x] 2. 백업·복원 대화상자 연결·실제 앱 검사·기록

## 재개 위치
구현 끝, Codex 검증을 기다린다(review).
검증 지점:
- 단위 검사: `tests/backup-seal.test.cjs`
- 실제 앱 검사: `tests/desktop-backup-password-smoke.cjs`
- 갱신한 smoke: `desktop-smoke`, `desktop-recurrence-smoke`(`tests/backup-ui.cjs`)
- 복원 IPC의 반환형 변경(`{data}` / `{needsPassword,name}` / null)

사용자 확인 필요: 앱에서 만드는 백업은 항상 암호로 잠근다(암호 없는 백업 선택지 없음).

## 테스트 상태
2026-10-20 Linux Node 22:
- `npm test` 196/196 통과(서울·뉴욕·키리티마티).
- `npm run test:desktop` 종료 0(PASS 22줄, 새 `desktop-backup-password-smoke` 포함).
- 화면 150건·실패 0, 업무 과업 통과, Codex 감사 3종(modular-contract, nav-zones, postmerge-boundary) 종료 0.
- 기존 smoke 2개(`desktop-smoke`, `desktop-recurrence-smoke`)는 백업 단계를 암호 입력으로 갱신했다(`tests/backup-ui.cjs`). 복원 확인은 평문 백업 복원도 계속 검사한다.
- Windows Actions [39389450176](https://github.com/Recon987/AI-Coding/actions/runs/39389450176)(4bdae7c) 성공. 소스·패키징 앱 모두 `desktop-backup-password-smoke`를 포함한다. 시작 복구 창 부분은 개발 실행에서만 돈다.
- 기관 실기기: 미확인.

## 구현 결정
- 봉투 `{version:3, minReader:3, backupSealed:{format:"park-workdesk-backup", version:1, kdf:"scrypt", N, r, p, salt, alg:"AES-256-GCM", iv, tag, data}}`. 저장 봉투(`sealed`)와 키 이름을 달리해 어느 쪽인지 섞이지 않는다.
- 파일에 적힌 비용은 N 2^14~2^18, r 1~8, p 1~4만 받는다(조작된 파일이 메모리 수 GB를 요구하지 못하게).
- 암호는 NFC로 정규화한다(같은 한글 암호를 다른 PC에서 입력해도 열림). 규칙: 10~256자, 서로 다른 글자 4개 이상. 강도 안내(약함/보통/강함)는 참고용이다.
- 일반 읽기(`store.read`: 시작·last-good·보호본)는 암호 백업을 열지 않는다(`BACKUP_PASSWORD_REQUIRED`).

## 검증 기록
