---
id: TASK-AXDESK-02
title: AX Desk GIS·AI 스니펫 보관함
status: review
role: builder
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends: TASK-AXDESK-01
priority: P3
updated: 2026-10-19
---

## 배경
TASK-ARCH-MODULAR-01 Step C-2. [보정 명세](../specs/modular-ax/implementation.md) 5장 '스니펫 보관함'.

## 의존 예외
- 의존 예외: TASK-AXDESK-01 (사용자 승인 2026-10-19, "이어서 AXDESK-02 진행해" — AXDESK-01은 Codex 기능 승인 후 MODULES-01 재검증 대기로 review. 검증에서 바뀌는 점은 이 카드에도 반영)

## 완료 조건
- [x] 분류(GEE/Python/프롬프트/법령·지침) 필터, 제목·태그·설명·본문 검색, 등록·수정·삭제
- [x] 원클릭 복사(성공·실패 안내), 코드는 텍스트로만 표시(실행·HTML 삽입 없음), 한글·따옴표·개행·큰 본문 저장/복사 동일
- [x] 예제 3개는 최초 초기화 때만, 고정 예제 ID·표시로 구분, 지운 뒤 다시 채우지 않음
- [x] `npm test`, `npm run test:desktop` 통과

## 범위 밖
코드 실행, 외부 호출.

## 진행 단계
- [x] 1. 목록·검색·복사
- [x] 2. 예제·검사·기록

## 재개 위치
구현 완료, Codex 검증 대기. 검증 때 볼 곳: src/components/AxSnippets.tsx, shared/ax.mjs(AX_EXAMPLE_SNIPPETS·examplesAdded·withExampleSnippets), shared/search.mjs(axSnippet), src/components/Briefing.tsx(첫 사용 판정에서 예제 제외), tests/ax-desk.test.cjs(스니펫 4개), tests/desktop-snippets-smoke.cjs. 다음 카드: TASK-AXDESK-03(보고서 초안).

## 구현 메모
- 화면: AX 모듈의 두 번째 화면 "GIS·AI 스니펫"(Page `ax-snippets`, 제목 아래 보기 전환 "AX 사업 관리 | GIS·AI 스니펫"). 분류 단추(전체·GEE·Python·프롬프트·법령·지침, 건수, aria-pressed), 검색(제목·분류·태그·설명·본문), 등록·수정·삭제(확인). 열: 수정일 / 구분(예제) / 분류 / 제목(+태그) / 분량(줄 수). 행 동작 순서: 복사(주 동작)·수정·삭제.
- 표시: 본문은 `<pre><code>{text}</code></pre>` React 글자로만(HTML 해석·실행 없음), 고정폭 글꼴(로컬 글꼴만), 가로 스크롤, 키보드로 스크롤 가능(tabIndex 0).
- 복사: 기존 방식(`navigator.clipboard.writeText`, FormExport와 같음). 성공 "'제목' 본문을 복사했습니다(n자).", 실패 "복사하지 못했습니다. 행을 펼쳐 본문을 직접 선택해 복사하세요."(목록 위 상태 줄, role=status).
- 태그: 쉼표로 입력, 같은 태그는 한 번만, 20개·각 30자 초과는 저장 전 칸 오류·포커스 이동.
- **예제 3개 — 명세 해석(검증·사용자 확인 바람)**: 명세의 "최초 초기화에서만 넣는다"를 "자동 주입"이 아니라 **빈 보관함의 '예제 3개 넣기' 단추를 누를 때 한 번**으로 구현했다. 이유: 명세의 다른 조건 "단순 열람으로 기존 JSON을 다시 쓰지 않는다", "사용자가 지운 빈 목록을 다시 채우지 않는다"를 함께 지키려면 넣은 사실을 기록해야 하고, 자동 주입은 사용자가 하지 않은 저장을 만든다. 넣으면 `modules.customConfigs["ax-desk"].examplesAdded = true`를 남기고, 이후에는 지워도·재실행해도 다시 제안하지 않는다. 고정 ID(`example-gee-sentinel2`·`example-dd-dms`·`example-report-prompt`), `example: true`, 화면에 '예제' 표시. 이미 저장된 모듈 설정은 순서·다른 설정을 그대로 두고, AX 설정 자리에 이 버전이 읽을 수 없는 값이 있으면 덮지 않고 안내만 한다(명세 3장).
- 예제는 사용자 기록이 아니므로 홈 첫 사용 안내 판정에서 뺐다. 예제를 고쳐 저장하면 예제 표시가 빠지고 내 스니펫이 된다.
- 예제 내용: Sentinel-2 구름 제거 중앙값 합성 GEE 코드, 위경도 DD↔DMS Python 함수(표기 변환이며 투영 변환 아님), 보고서 초안 프롬프트('[작성 필요]' 규칙, 개인정보·미공개 자료 금지 안내). 모두 글자 자료이고 실행·외부 호출 없음.
- 측정: Playwright `fill`은 긴 글에서 매우 느리다(1만 자 1.7초, 3만 자 16초). 앱은 10만 자 입력을 0.2초에 받는다. 실제 앱 검사는 사람처럼 클립보드 붙여 넣기로 10만 자를 넣는다.

## 테스트 상태
2026-10-19 Linux(Node 22): `npm test` 153/153(스니펫 새 4개), `npm run test:desktop` 종료 0(진입점 15개 + 감사 3개, 새 desktop-snippets-smoke), 화면 검사(확대 포함 strict) 150·실패 0·외부 요청 0, 업무 과업 11/11(클릭 수 변화 없음). Windows는 푸시 후 수동 실행.

## 검증 기록
