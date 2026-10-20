---
id: TASK-LOCATION-01
title: 담당구역 번호 목록(로컬 반입)과 순찰 선택 입력
status: review
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends: TASK-REVIEW-DOMAIN-01
priority: P3
updated: 2026-10-20
---

## 배경
[도메인 D4](../reviews/2026-10-16-domain.md), [UX U4](../reviews/2026-10-16-ux.md). 현장 위치 표기 방식은 사용자 확인 필요.

## 착수
- 2026-10-20 사용자 요청 "이어서 LOCATION-01 진행해"로 backlog → in-progress(사용자 승인). 클라우드 세션 지정 브랜치 사용. 담당이 claude가 되어 검증자를 codex로 바꿈.

## 설계 메모 (1단계)
- **자료**: 선택 최상위 컬렉션 `zones` = `[{ id, code, name, route, active }]`. `code`는 순찰의 `zone`(담당구역 번호, 50자)에 들어가는 값, `name` 구역 이름(100자), `route` 대표 순찰 구간(500자, 비워도 됨), `active` 사용 여부. 코드 중복 금지(앞뒤 공백 제거 후), 10,000건 한도. 없는 자료는 빈 목록으로 읽음. 열거값 변경이 없어 READER_VERSION 그대로(구버전은 모르는 최상위 항목으로 보존).
- **반입**: 사무소 CSV 반입과 같은 파서(`parseCsv`). 머리글 `code,name,route,active`(active는 true/false, 비우면 true). 같은 코드는 갱신, 새 코드는 추가, 파일에 없는 기존 구역은 유지. 미리보기(추가·수정·유지 건수와 행별 결과) 뒤에 적용. 한 행이라도 틀리면 `N행: 이유`로 전체 거부, 파일을 쓰지 않음.
- **화면**: 자료 관리 → "담당구역 목록" 시트(공휴일 관리와 같은 위치). 목록·CSV 파일/붙여 넣기 반입·미리보기·적용·구역 삭제(확인). 삭제해도 순찰 기록의 구역 번호는 그대로.
- **순찰 입력**: 담당구역 번호 칸에 사용 중인 구역 제안 목록(datalist, "코드 · 이름"). 목록 구역을 고르고 순찰 구간이 비어 있으면 그 구역의 대표 구간을 채우고 안내. 순찰 구간 칸에 제안 목록: 선택 구역의 대표 구간 + 최근 순찰 구간(중복 없이 최근 순 10개). 자유 입력은 그대로 허용하고 기존 값은 거부하지 않음. 목록에 없는 번호면 "목록에 없는 번호(그대로 저장 가능)" 안내.

## 완료 조건
- [x] 사용자 답변으로 위치 표기 방식 확정: 담당구역 번호, 단속은 위경도(2026-10-16)
- [x] CSV 반입·검증·미리보기(사무소 CSV 반입과 같은 방식)
- [x] 순찰 구간 선택 입력과 최근 값
- [x] `npm test`, `npm run test:desktop` 통과

## 범위 밖
국가지점번호 변환(별도 검토), GPS 수집.

## 진행 단계
- [x] 1. 설계 메모(필드·화면)를 이 카드에 추가
- [x] 2. 구현
- [x] 3. 테스트·문서

## 재개 위치
구현 완료, Codex 검증 대기. 검증 때 볼 곳: shared/zones.mjs·zones-import.mjs(+d.mts), shared/model.mjs(선택 컬렉션 `zones`), src/types.ts(`Zone`), src/components/ZoneManager.tsx(자료 관리 → 담당구역 목록), src/components/Patrols.tsx(담당구역·순찰 구간 제안, 대표 구간 채움, 목록 밖 안내), tests/zones.test.cjs, tests/desktop-zones-smoke.cjs, docs/architecture.md.

## 구현 메모
- 설계 메모대로 구현. 추가로: 사용 안 함(active false) 구역은 제안에서 빼고 목록 표에는 보인다. 자동 채움은 순찰 구간이 비어 있을 때만 하고, 직접 쓴 구간은 덮지 않는다. 읽기 전용 자료에서는 반입·삭제를 잠근다. 미리보기 뒤 자료가 바뀌면 미리보기를 지워 낡은 미리보기를 적용하지 못하게 했다(사무소 반입과 같음).
- 측정: 업무 과업 검사 자료에는 담당구역 목록이 없어 클릭·입력 수는 그대로(T2 5클릭·6칸·39자). 목록이 있으면 구역을 고를 때 대표 구간이 채워져 구간 입력을 건너뛸 수 있다(실제 앱 검사로 확인).

## 테스트 상태
2026-10-20 Linux(Node 22): `npm test` 167/167(서울·뉴욕, zones 5개), `npm run test:desktop` 종료 0(진입점 18 + 감사 3, 새 desktop-zones-smoke), 화면 검사(확대 포함 strict) 150·실패 0·외부 요청 0, 업무 과업 11/11(변화 없음). Windows 39358186950(82f3a59, workflow_dispatch) 성공: 소스·설치본 실제 앱 검사(담당구역 검사 포함) 통과.

## 검증 기록
