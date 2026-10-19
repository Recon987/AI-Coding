---
id: TASK-FORMS-02
title: 추천 양식 v2 — 단속 조치에 '고발·인계' 추가
status: review
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends: TASK-FORMS-01, TASK-SCHEMA-01
priority: P2
updated: 2026-10-19
---

## 배경
FORMS-01 v1(순찰일지·단속·계도 기록 출력)과 초안(docs/research/forms-draft.md)에 대한 사용자 피드백을 받아 고친다. 시설 점검표는 자료 모델(시설·점검 항목·상태)이 없어 피드백 후 구현한다.

## 의존 예외
- 의존 예외: TASK-SCHEMA-01 (사용자 승인 2026-10-19, SCHEMA-01은 구현·Linux/Windows 검사 완료 후 Codex 검증 대기. 검증에서 바뀌는 점은 이 카드에도 반영)

## 완료 조건
- [x] forms-draft.md '사용자에게 확인할 것' 4개 질문의 답과 날짜를 '피드백 기록'에 남김(2026-10-19, Claude 추천 위임)
- [x] 단속 조치 값에 '고발·인계'(referral) 추가: types·검증·집계·양식 출력·화면 선택지, minReader 상향(TASK-SCHEMA-01 규칙)
- [x] `npm test`, `npm run test:desktop` 통과

## 범위 밖
공식 서식 대체, 결재 연동, 위반자 인적사항. 시설 점검표(실제 서식을 받을 때까지 보류), 인쇄 전용 화면.

## 진행 단계
- [x] 1. 사용자 피드백 받기
- [x] 2. 모델: OBSERVATION_OUTCOMES에 referral '고발·인계', READER_VERSION 2, referral을 쓰는 자료만 minReader 2로 저장(아니면 지금처럼 필드 없음), 집계 열 추가
- [x] 3. 화면·양식: 조치 선택지, 순찰 집계·TXT/CSV 양식의 고발·인계 열, 타입
- [x] 4. 테스트(허용값 스냅샷 갱신·minReader 자동 기록·구버전 보호 왕복)·기록

## 재개 위치
Codex 독립 검증 승인(기준afc3825). 제품 카드는 main 병합 전 review 유지. 전체 병합은 별도 HOLIDAY-01의 HL-01·BACKUP-02의 BK-01 반려 사항 보완 후 총괄이 진행한다.

## 구현 내용·검증 요점
- `shared/model.mjs`: `OBSERVATION_OUTCOMES.referral = "고발·인계"`(계도·과태료 부과 다음, 기타 조치 앞). `READER_VERSION` 1 → 2. 저장 결과의 `minReader` = max(파일에 있던 값, 내용이 요구하는 값). '고발·인계'가 하나라도 있으면 2, 없으면 지금처럼 필드 없음. 한 번 올라간 값은 낮추지 않는다(지운 뒤에도 2 유지 — 구버전에서 읽기 전용이 되는 것뿐이라 안전 쪽).
- 집계 `patrolSummary` 행에 `referral` 열, 브리핑·양식 TXT 합계 문구는 조치 이름 맵에서 만든다('기타' → '기타 조치'로 다른 화면과 같아짐). CSV '조치' 칸에 '고발·인계'. 화면의 조치 선택지와 집계표 열은 맵에서 자동.
- 구버전과의 관계: SCHEMA-01 앱(읽기 수준 1)은 이 파일을 손상으로 처리하지 않고 "새 버전 자료"로 안내 후 파일을 그대로 둔다(내용을 해석할 수 없어 읽기 전용 화면도 열지 않음). SCHEMA-01 이전 앱(v0.8.0 이하)은 보호되지 않으므로 백업 안내 유지.
- 위반자 인적사항·과태료 금액은 여전히 기록하지 않는다.

## 테스트 상태
2026-10-19 Linux(Node 22): `npm test` 108/108(새 2: minReader 자동 기록·낮추지 않음·집계·TXT/CSV, 보드 의존 예외), `npm run test:desktop` 11개 진입점, 화면 검사 150개 실패 0·외부 요청 0, 업무 과업 11/11. 실제 앱에서 저장 파일 minReader 2와 960px 집계표 확인. Windows 수동 실행 [39226923903](https://github.com/Recon987/AI-Coding/actions/runs/39226923903)(7b02d5d) 성공.

## 검증 기록

### 2026-10-19 Codex 독립 검증 — 승인
referral 선택값·조치별 집계·TXT/CSV 출력·minReader2 자동 상향 및 제거 후 유지가 통과했다. 실제 SCHEMA-01 reader1 코드의 안전 거부·원본 보존도 확인했다. 공식 서식 대체나 위반자 인적사항 수집은 추가하지 않았다.
Node24 단위129/129(감사13 포함), 실제 앱13개 진입점(감사5/5 포함), 화면150/실패0/외부요청0·업무흐름11/11 통과. 개별 Windows 커밋/실행 성공과 누적afc3825의39232674307(소스13/패키지12·감사 각5/5)을 확인했다. [일괄 검토·증빙·병합 판정](../reviews/2026-10-19-codex-dispatch.md). 이 카드 승인과 전체 main 병합 승인을 구분한다.
