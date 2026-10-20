---
id: TASK-SECURITY-01
title: 저장·백업 암호화 설계(Windows DPAPI/safeStorage)
status: in-progress
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends: TASK-DATA-01
priority: P1
updated: 2026-10-20
---

## 배경
업무 자료와 백업이 평문이다. 실제 민원인 정보를 넣기 전에 필요하다(`docs/project-review.md` 운영 전 남은 사항).

## 착수
- 2026-10-20 사용자 요청 "이어서 SECURITY-01 진행해"로 backlog → in-progress(사용자 승인). 클라우드 세션 지정 브랜치 사용. 담당이 claude가 되어 검증자를 codex로 바꿈. 이번 세션은 1단계(위협 모델·설계안)까지: 구현은 사용자 승인 뒤.

## 완료 조건
- [x] 위협 모델 문서(분실 PC, 공용 PC, 백업 USB 반출) — [설계안](../research/security-01-design.md) 3장
- [ ] 키 분실·복구 정책과 이동 백업 암호 방식 결정(사용자 승인)
- [ ] 평문→암호 전환 시 원본 백업, 대용량 성능 측정

## 범위 밖
서버 키 관리.

## 진행 단계
- [ ] 1. 위협 모델·설계안(사용자 승인 필요) — 설계안 작성 완료, **사용자 결정 대기**
- [ ] 2. 구현
- [ ] 3. 전환·성능 검증

## 재개 위치
1단계 설계안 작성 완료([docs/research/security-01-design.md](../research/security-01-design.md)), **사용자 결정 대기**(9장 다섯 가지: 보호 방식·복구 키·백업 암호·알림 제목 숨김·기관 PC 사정). 결정을 받으면 8장대로 SECURITY-02~04 카드를 만들고 이 카드는 설계 승인 기록 후 done으로 정리한다. 제품 코드는 아직 바꾸지 않았다.

## 테스트 상태
2026-10-20: 제품 코드 변경 없음. `node scripts/security-bench.cjs`(설계 측정, 앱에 포함 안 됨) — 20MB AES-256-GCM 봉함 175ms·열기 15ms·변조 거부, scrypt N=2^17 427ms/128MB. Electron safeStorage는 이 Linux 환경에서 사용 불가(basic_text), Windows 확인은 구현 단계. `npm test` 169/169.

## 검증 기록
