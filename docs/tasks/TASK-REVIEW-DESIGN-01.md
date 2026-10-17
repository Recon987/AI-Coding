---
id: TASK-REVIEW-DESIGN-01
title: 유사 데스크톱 업무 앱·현장 기록 시스템 레퍼런스 조사와 시각·UX 개선안
status: review
role: design
owner: claude
verifier: codex
branch: claude/zen-cannon-wc1at4
depends:
priority: P1
updated: 2026-10-16
---

## 배경
UI는 두 차례 내부 검토(시각 2.2→3.9)를 거쳤지만 외부 레퍼런스와 비교한 적이 없다. 사용자는 디자인과 사용성이 부족하다고 평가했다.

## 완료 조건
- [x] 레퍼런스 최소 8개(9개. 화면 자료를 못 얻은 제품은 '일반 특징'으로 근거 표시)를 세 묶음으로: (a) 데스크톱 업무·일정 도구, (b) 현장 순찰·점검·시설관리 앱, (c) 공공·정부 디자인 시스템(KRDS 등). 묶음별 참고할 점·피할 점
- [x] 현재 화면 캡처(`npm run review:ui` 결과)와 나란히 비교한 문제 목록, review-lenses B·C 점수
- [x] 개선안을 "디자인 토큰(색·타이포·간격) / 레이아웃 / 컴포넌트 / 흐름"으로 나누고 각각 예상 효과와 구현 범위
- [x] 오프라인 원칙 확인: 원격 폰트·CDN 없이 가능한 안만 채택(번들 가능한 폰트 라이선스 명시)
- [x] `docs/reviews/2026-10-16-design.md`

## 범위 밖
코드 수정. 타 제품의 아이콘·이미지·문구 복제.

## 진행 단계
- [x] 1. 레퍼런스 수집
- [x] 2. 현재 화면 캡처 비교
- [x] 3. 개선안과 우선순위

## 재개 위치
Codex 검증: 발견 V1~V11의 근거(캡처·style.css 줄)를 재현 확인. 사용자는 문서 끝의 Gemini 2차 의견 질문과 docs/ui-review/cycle1 캡처를 Gemini에 전달 가능.

## 테스트 상태
문서 과제. 2026-10-16 `npm run review:ui` 134개 통과·외부 요청 0, `npm test` 통과.

## 검증 기록


### Codex 검증 (2026-10-16)

기준73c938e 및 task/task-review-claude-01의 보완본 검토. 화면/토큰 근거와 참조 범위 대조, 지원 해상도 독립 확인. Node24 npm test70/70·전체test:desktop·UI142·업무흐름10/10 통과. 상세 재현/제약: [독립 검토 기록](../reviews/2026-10-16-codex-claude.md). main 미병합이므로 status는 review 유지.
