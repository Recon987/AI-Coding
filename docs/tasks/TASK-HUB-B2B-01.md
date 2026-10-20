---
id: TASK-HUB-B2B-01
title: B2b 사업 공간 화면과 근거 자료 연결
status: ready
role: builder
owner: none
verifier: claude
branch: task/task-hub-b2b-01
depends: TASK-HUB-B2A-01
priority: P1
updated: 2026-10-20
---

## 배경
구현은 Codex, 검증은 Claude가 맡는다(2026-10-20 사용자·Gemini 승인). 명세는 [claude-hub-schema-plan-2026-10-20.md](../product/claude-hub-schema-plan-2026-10-20.md) 3·4·6장이고, 문구 표준은 6장 B2b다.

## 완료 조건
- [ ] 메뉴·화면 "사업 공간"
  - 주 행동: "사업 등록", 사업을 고른 뒤 "작업 등록"
  - 분야 라벨: 시설·자원보전·AX·행정·일반
  - 섹션: "연결된 작업", "회의·전화·순찰 기록", "근거 자료"
- [ ] 근거 보관함: 폴더·스니펫·공문번호·파일을 등록하고 여러 사업·작업에 붙임
  - 위치 보기 IPC는 `shell.showItemInFolder`만 쓰고 실행하지 않음
  - 파일이 없으면 표시만 함
- [ ] 모듈 계약 1판. AX `fields.project`(권역·예산 천원·집행률)와 `deadlines` 이관
  - 이관 전후 브리핑 출력 동일
  - AX 모듈을 끄거나 켜도 작업 연결 유지
- [ ] 사업 삭제 시 원본(작업·기록·근거) 보존, 확인창
- [ ] `npm test`, `npm run test:desktop`, Windows Actions 통과

## 범위 밖
AX 저장소 통합, 관리형 첨부 복사, 간트·다단계 작업.

## 진행 단계
- [ ] 1. 사업 목록·개요·연결된 작업
- [ ] 2. 근거 보관함·위치 보기 IPC
- [ ] 3. 모듈 계약 1판·AX 이관·실제 앱 검사

## 재개 위치
B2a 병합 뒤 착수.

## 테스트 상태
미실행

## 검증 기록
