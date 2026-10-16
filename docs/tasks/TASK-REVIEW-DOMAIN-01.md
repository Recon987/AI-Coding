---
id: TASK-REVIEW-DOMAIN-01
title: 국립공원공단 직무별 실제 업무 흐름 조사와 앱 적합성 검토
status: review
role: domain
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends:
priority: P1
updated: 2026-10-16
---

## 배경
현재 앱은 순찰→인계→제출 흐름 중심의 일반 업무 수첩이며, 공단 업무 도메인이 충분히 반영됐는지 검토된 적이 없다. 사용자도 "정말 쓸 만한 앱인지" 의문을 제기했다.

## 완료 조건
- [x] 공개 자료(공단 누리집·경영공시·직무 소개·채용 직무기술서, 자연공원법 등 관련 법령) 기반 직무 분류와 직무별 일·주·계절 업무 목록. 출처 링크 필수
- [x] 직무마다 "현재 앱으로 되는 것 / 우회해야 하는 것 / 안 되는 것" 표
- [x] 계절성 업무(산불조심기간 입산통제, 하절기 집중호우·폭염, 동절기 결빙·적설 통제, 성수기 야영장·대피소) 반영 여부
- [x] 근거가 공개 자료에 없는 업무 규칙은 "가설 — 사용자 확인 필요"로 분리하고 사용자에게 물을 질문 목록 작성
- [x] `docs/research/knps-domain.md`와 `docs/reviews/2026-10-16-domain.md`(review-lenses A, 점수와 발견 표)

## 범위 밖
코드 수정. 내부망·비공개 자료 접근. 공식 시스템 대체 주장.

## 진행 단계
- [x] 1. 직무 분류와 출처 수집
- [x] 2. 직무별 업무 흐름 정리
- [x] 3. 앱 기능 대조표
- [x] 4. 발견·제안·사용자 질문 정리

## 재개 위치
Codex 검증: docs/research/knps-domain.md의 [확인] 출처가 실제로 해당 내용을 담는지 표본 확인, docs/reviews/2026-10-16-domain.md의 코드 근거(types.ts Patrol, briefing()) 대조. 사용자 답변(knps-domain.md 6장) 대기.

## 테스트 상태
문서 과제. 2026-10-16 `npm test` 통과(보드 검사 포함).

## 검증 기록


### Codex 검증 (2026-10-16)

기준73c938e 및 task/task-review-claude-01의 보완본 검토. 2011 채용 기사 및 공식 법령목록 본문 표본 확인. 조사/가설 구분 승인, 내부 업무 표준 확정 아님. Node24 npm test70/70·전체test:desktop·UI142·업무흐름10/10 통과. 상세 재현/제약: [독립 검토 기록](../reviews/2026-10-16-codex-claude.md). main 미병합이므로 status는 review 유지.
