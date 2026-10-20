---
id: TASK-SECURITY-02
title: 저장 봉투·데이터 키(DPAPI)·복구 키
status: done
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends: TASK-SECURITY-01
priority: P1
updated: 2026-10-20
---

## 배경
- 의존 예외: TASK-SECURITY-01 (사용자 승인 2026-10-20, "이어서 SECURITY-02 진행해" — 설계 카드는 Codex 검토 대기)

[설계안](../research/security-01-design.md) 5장 권장안 D, 10장 사용자 결정(2026-10-20).

## 완료 조건
- [x] store.cjs 저장 계층에서 봉투 `{version:3, minReader:3, sealed:{AES-256-GCM}}` 쓰기·읽기(자료 스키마 불변), 주 파일·last-good·모든 보호본·임시 파일에 적용
- [x] 데이터 키: 무작위 256비트, `safeStorage`(DPAPI)로 감싼 값과 복구 키로 감싼 값을 `workdesk.key.json`에 저장. 평문 키 디스크 기록 없음. safeStorage를 쓸 수 없으면 켜지 않고 이유 표시
- [x] 복구 키 발급(처음 한 번 표시·인쇄 안내·공용 PC/동기화 경고), DPAPI로 못 열 때 복구 키 입력 화면
- [x] 변조·키 불일치·복구 키 틀림·디스크 가득 참에서 원본 보존과 안내, 구버전(reader 2) 앱이 봉한 파일을 바꾸지 않음 확인
- [x] `npm test`, `npm run test:desktop`, Windows Actions(DPAPI 실제 사용) 통과

## 범위 밖
백업 암호(SECURITY-03), 기존 평문 전환(SECURITY-04).

## 진행 단계
- [x] 1. 봉투·키 순수 함수와 단위 검사 (`desktop/seal.cjs`, `tests/seal.test.cjs` 7건)
- [x] 2. store.cjs·main.cjs 연결, safeStorage
- [x] 3. 복구 키 화면·실제 앱 검사·기록

## 재개 위치
구현 완료. Codex 검증 대기(review).
검증자 확인 지점:
- 단위 검사: `tests/seal.test.cjs`, `tests/store-sealed.test.cjs`
- 실제 앱 검사: `tests/desktop-security-smoke.cjs`
- 감사 수정: `tests/desktop-nav-zones-audit.cjs`의 미래 자료 수준을 `READER_VERSION + 1`로 바꿈

남은 일(다른 카드):
- 켜기 전에 만든 평문 사본 정리와 기본 켜기 여부(SECURITY-04)
- 다른 PC에서 복원하기: 백업 암호(SECURITY-03). 지금은 켠 뒤 만든 백업을 그 PC에서만 바로 복원할 수 있다.

## 테스트 상태
2026-10-20 Linux Node 22:
- `npm test` 188/188 통과(시간대 5종: 서울·뉴욕·UTC·키리티마티·파고파고).
- `npm run test:desktop` 종료 0(진입점 19개, 새 `desktop-security-smoke` 포함, 감사 포함).
- 화면 검토 150건·실패 0, 업무 과업 11/11.
- Codex 감사: `modular-contract-audit` 통과, `postmerge-boundary-audit` 통과, `desktop-nav-zones-audit` 5/5 통과.
  - `desktop-nav-zones-audit`은 고친 뒤 통과했다. 이 감사는 "미래 자료"를 `minReader: 3`으로 고정해 두었는데, 이번 카드에서 READER_VERSION이 3이 되어 실패했다. 계약 변경에 맞춰 `READER_VERSION + 1`로 바꿨다(검사 의도는 그대로).
- Windows Actions [39383034461](https://github.com/Recon987/AI-Coding/actions/runs/39383034461)(1bc848b) 성공.
  - 소스 실행: `desktop-security-smoke`가 "시험용 보호기"로 통과.
  - 패키징 앱: "safeStorage 실제"로 통과. Windows DPAPI로 켜기·봉투·자동 열기·키 파일 없음 → 복구 키를 확인했다.
  - 다른 PC 보호기·보호기 없음 장면은 시험용 보호기가 필요해 패키징 실행에서는 건너뛴다(소스 실행에서 확인).
- 기관 실기기: 미확인.

## 설계 보완(구현 중 결정)
- 봉투에 복구 키로 감싼 데이터 키 사본(`sealed.recovery`)을 함께 넣는다. 키 파일이 지워지거나 다른 PC로 옮겨도 종이 복구 키로 열 수 있게 하려는 것이다. 복구 키는 120비트 무작위라 HKDF-SHA256으로 충분하다.
- 키 파일에 `check`(데이터 키 HMAC 앞 16바이트)를 둬서 보호기가 엉뚱한 값을 돌려줘도 잘못된 키로 저장하지 않는다.

## 검증 기록

### 2026-10-20 사용자 명시 승인 선병합 (Codex 사후 검증 예정)
- 근거: 사용자·Gemini 지시 "[USER & GEMINI → CLAUDE: review 카드 선병합(사후 검증 조건) 승인 …]". 8·9주기와 같이 **사용자 명시 승인**으로 main에 먼저 병합한다.
- **Codex 독립 검증은 아직 받지 않았다**(사후 검증 예정). 사후 검증에서 결함이 나오면 새 카드로 보완한다.
- 병합 묶음: `claude/zen-cannon-wc1at4` + Codex B1(`task/task-hub-b1-01` d7805e5, Claude 독립 검증 통과).
