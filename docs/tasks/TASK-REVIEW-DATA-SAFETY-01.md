---
id: TASK-REVIEW-DATA-SAFETY-01
title: 저장 실패·백업 복원·구버전 호환성 독립 감사
status: in-progress
role: verifier
owner: codex
verifier: claude
branch: task/task-review-data-safety-01
depends:
priority: P1
updated: 2026-10-19
---

## 배경과 기준
사용자가 Claude 작업과 겹치지 않는 자료 안전성 검증을 승인했다. 기준은 원격20cdc3c(TASK-BACKUP-02 포함)로 고정한다. 실제 자료는 읽지 않고 임시 프로필의 가상 자료만 사용한다.

## 범위
저장 중 오류·손상/누락·잘못된 백업·v1/v2 전환·미래 자료 읽기 전용·복원 보호본 정리. 기존 공용 소스·기존 테스트·의존성·docs/handoff.md는 수정하지 않는다. 추가 독립 검사와 이 카드·전용 검토/작업 기록/인계만 작성한다. 실제 결함은 증빙과 함께 Claude에 인계하며 구현을 중복하지 않는다.

## 완료 조건·진행 단계
- [x] 원격 확인·기준 고정·별도 카드 선점
- [x] 기존 단위·데스크톱 검사 결과 확인
- [x] 저장 실패·복원 실패·전환·호환 경계의 추가 독립 검사
- [ ] 발견·제약·재현 코드·전용 인계 패킷을 기록하고 푸시

## 재개 위치
DS-01(P1) 재현 증빙과 최종 검토·전용 인계 작성. desktop/store.cjs pruneRestoreCopies의 목록 읽기 예외가 main.cjs의 복원 확정 이후 전파되어 renderer 상태가 이전으로 남고 다음 저장이 복원 기록을 덮어쓴다. 공용 코드는 수정하지 않았다.

## 테스트 상태
기준20cdc3c: npm test116/116·test:desktop12개 진입점 통과. 기존 Windows39230668333 성공(단위116·소스12/패키지11, 각 PASS·예외0). 독립 단위13/13 통과. 신규 실제 앱 감사는4개 중3통과·1실패(DS-01, 복원 뒤 정리 목록 읽기 실패 → 다음 저장에서 복원 기록 손실). 전체 안전성 승인 아님.

## 검증 기록
