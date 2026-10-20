---
id: TASK-SECURITY-01
title: 저장·백업 암호화 설계(Windows DPAPI/safeStorage)
status: done
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
- [x] 키 분실·복구 정책과 이동 백업 암호 방식 결정(사용자 승인) — 2026-10-20 D 채택, 백업 암호 매번 입력, 알림 제목 숨김 선택 기능([설계안 10장](../research/security-01-design.md))
- [ ] 평문→암호 전환 시 원본 백업, 대용량 성능 측정 — 설계·사전 측정 완료(설계안 5·6장), 구현·실측은 SECURITY-04로 이관

## 범위 밖
서버 키 관리.

## 진행 단계
- [x] 1. 위협 모델·설계안(사용자 승인 필요) — 2026-10-20 승인
- [ ] 2. 구현 — SECURITY-02·03·05 카드로 분리
- [ ] 3. 전환·성능 검증 — SECURITY-04 카드로 분리

## 재개 위치
설계 카드로 마무리: 위협 모델·결정 기록 완료, 구현은 SECURITY-02~05. Codex는 설계안(docs/research/security-01-design.md)의 위협 모델·봉투 형식·구버전 혼용(minReader 3)·전환 한계를 검토한다. 승인되면 done.

## 테스트 상태
2026-10-20: 제품 코드 변경 없음. `node scripts/security-bench.cjs`(설계 측정, 앱에 포함 안 됨) — 20MB AES-256-GCM 봉함 175ms·열기 15ms·변조 거부, scrypt N=2^17 427ms/128MB. Electron safeStorage는 이 Linux 환경에서 사용 불가(basic_text), Windows 확인은 구현 단계. `npm test` 169/169.

## 검증 기록

### 2026-10-20 사용자 명시 승인 선병합 (Codex 사후 검증 예정)
- 근거: 사용자·Gemini 지시 "[USER & GEMINI → CLAUDE: review 카드 선병합(사후 검증 조건) 승인 …]". 8·9주기와 같이 **사용자 명시 승인**으로 main에 먼저 병합한다.
- **Codex 독립 검증은 아직 받지 않았다**(사후 검증 예정). 사후 검증에서 결함이 나오면 새 카드로 보완한다.
- 병합 묶음: `claude/zen-cannon-wc1at4` + Codex B1(`task/task-hub-b1-01` d7805e5, Claude 독립 검증 통과).
