---
id: TASK-HUB-B2B-01
title: B2b 사업 공간 화면과 근거 자료 연결
status: in-progress
role: builder
owner: codex
verifier: claude
branch: task/task-hub-b2b-01
depends: TASK-HUB-B2A-01
priority: P1
updated: 2026-10-20
---

## 배경
- 의존 예외: TASK-HUB-B2A-01 (사용자 승인 2026-10-20, B1+B2a 통합 검증과 B2b 연속 착수 지시)
구현은 Codex, 검증은 Claude가 맡는다(2026-10-20 사용자·Gemini 승인). 명세는 [claude-hub-schema-plan-2026-10-20.md](../product/claude-hub-schema-plan-2026-10-20.md) 3·4·6장이고, 문구 표준은 6장 B2b다.

## 완료 조건
- [x] 메뉴·화면 "사업 공간"
  - 주 행동: "사업 등록", 사업을 고른 뒤 "작업 등록"
  - 분야 라벨: 시설·자원보전·AX·행정·일반
  - 섹션: "연결된 작업", "회의·전화·순찰 기록", "근거 자료"
- [x] 근거 보관함: 폴더·스니펫·공문번호·파일을 등록하고 여러 사업·작업에 붙임
  - 위치 보기 IPC는 `shell.showItemInFolder`만 쓰고 실행하지 않음
  - 파일이 없으면 표시만 함
- [x] 모듈 계약 1판. AX `fields.project`(권역·예산 천원·집행률)와 `deadlines` 이관
  - 이관 전후 브리핑 출력 동일
  - AX 모듈을 끄거나 켜도 작업 연결 유지
- [x] 사업 삭제 시 원본(작업·기록·근거) 보존, 확인창
- [ ] `npm test`, `npm run test:desktop`, Windows Actions 통과

## 범위 밖
AX 저장소 통합, 관리형 첨부 복사, 간트·다단계 작업.

## 진행 단계
- [x] 1. 사업 목록·개요·연결된 작업
- [x] 2. 근거 보관함·위치 보기 IPC
- [ ] 3. 모듈 계약 1판·AX 이관·실제 앱 검사

## 재개 위치
사업 공간·근거 보관함·기록 연결·모듈 계약 구현 완료. 단위220/220, B2b 실제 앱 검사 통과. 전체 데스크톱 회귀 검사 진행 중이며 Windows Actions가 남았다. 최종 결과와 기존 카드 6장의 독립 판정을 기록한 뒤 review로 전환한다. main 미병합, 구현자 Codex의 작업은 Claude 교차 검증이 필요하다.

## 테스트 상태
- Node 24.19.0 `npm test`: 220/220, 실패0.
- `npm run build`: 통과.
- B2b 실제 앱: 사업/AX 편집, 기존 기록 연결, 근거 재사용, 파일 없음/임의 경로 거부, AX 숨김, 삭제 보존, 봉함·암호 백업·복원·재실행·읽기 전용·외부 요청0 통과.
- 전체 desktop 진행 중. Windows 미실행. 저장 실패 초안/원본 보존·960px/125% 실제 앱 검사 통과.

## 검증 기록


## 통합 체크포인트
- bac7461 독립 기준: 단위206/206, 전체 desktop 종료0.
- B1 d7805e5를 merge commit으로 결합. 충돌은 보안·B1 양쪽 검사/컬렉션을 모두 보존해 해결.
- 통합 전체 단위212/212, 추가 통합/모델20/20, B1 실제 앱(암호 백업 포함) 통과. 추가 통합5건을 포함한 전체 검사는 최종 단계에서 실행한다.
- 공용 sourceView/validateSource에 회의·500자 출처를 반영, legacy source 읽기·remindMinutes:null 보완. links·meetings 무손실.
- 구현: 사업 공간 UI, 근거 위치 보기 IPC, 모듈 계약1판 완료. 보안/설계/B2a의 최종 판정은 통합 전체·Windows 결과 뒤 카드에 기록한다.
