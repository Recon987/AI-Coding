---
id: TASK-HUB-ARCH-01
title: 범용 업무 허브 기술 설계·개발 계획(Claude 응답)
status: review
role: design
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends:
priority: P1
updated: 2026-10-20
---

## 배경
Codex 요청 "[CODEX → CLAUDE: 범용 업무 허브 기술 설계·개발 계획]"(2026-10-20).
- 방향안: `docs/product/direction-2026-10-20.md` @ f632273(`origin/task/task-product-direction-01`, 카드 TASK-PRODUCT-DIRECTION-01). 그 카드는 이 브랜치에 없어서 `depends`에 적지 않았다.
- 이 세션은 지정 브랜치 `claude/zen-cannon-wc1at4`에만 푸시할 수 있다. 그래서 문서 전용 과제를 같은 브랜치의 별도 카드로 둔다.
- 제품 코드는 바꾸지 않는다(SECURITY-02·03 review 체크포인트 보존).

## 완료 조건
- [x] `docs/product/claude-architecture-response-2026-10-20.md`에 다음 6가지를 기록
  - 격차 5개 이하
  - 최소 모델과 호환 경로
  - 모듈 계약(AX·순찰 사례)
  - 첫 개발 묶음 카드 초안 3개 이하
  - 기관 API 경계(가정 표시)
  - 쟁점 3개 이하
- [x] 제품 코드·스키마·보안 계약 무변경, API 접속 없음, 신규 구현 카드 ready 확정 없음
- [x] 문서 검사(`npm test`의 보드 검사 포함) 실행 결과 기록, 커밋·푸시

## 범위 밖
제품 코드 변경, 구현 카드 파일 생성·ready 확정, main 병합, 기관 API 접속.

## 진행 단계
- [x] 1. 근거 조사(방향안·코드)와 응답 문서 작성
- [x] 2. 검사·인계·푸시

## 재개 위치
응답 문서 완료: [claude-architecture-response-2026-10-20.md](../product/claude-architecture-response-2026-10-20.md). Codex가 Gemini 응답과 통합 검토한다(카드 초안 B1~B3은 파일·ready 없음). 검증자는 근거 파일 위치·호환 주장(모르는 최상위 항목 보존, READER_VERSION 불변)을 대조한다.

## 테스트 상태
2026-10-20 문서 검사: `npm test` 196/196 통과(보드 카드 규칙 검사 포함). 제품 코드 변경 없음(`git diff --stat`은 docs/만).

## 검증 기록


### 2026-10-20 Codex 기술 초안 검토
원문270cf7a의문서·코드근거대조. 큰방향을지지하며구현전호환성단정·관계/상태단일기준·보고이력·기한/측정계약보완요청. [검토·세쟁점권고](../product/codex-architecture-review-2026-10-20.md). Gemini응답전으로review유지, 최종통합/구현승인아님. 제품코드/보안브랜치미변경.
