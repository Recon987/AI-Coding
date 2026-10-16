---
id: TASK-REVIEW-DESIGN-01
title: 유사 데스크톱 업무 앱·현장 기록 시스템 레퍼런스 조사와 시각·UX 개선안
status: ready
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
- [ ] 레퍼런스 최소 8개를 세 묶음으로: (a) 데스크톱 업무·일정 도구, (b) 현장 순찰·점검·시설관리 앱, (c) 공공·정부 디자인 시스템(KRDS 등). 묶음별 참고할 점·피할 점
- [ ] 현재 화면 캡처(`npm run review:ui` 결과)와 나란히 비교한 문제 목록, review-lenses B·C 점수
- [ ] 개선안을 "디자인 토큰(색·타이포·간격) / 레이아웃 / 컴포넌트 / 흐름"으로 나누고 각각 예상 효과와 구현 범위
- [ ] 오프라인 원칙 확인: 원격 폰트·CDN 없이 가능한 안만 채택(번들 가능한 폰트 라이선스 명시)
- [ ] `docs/reviews/<날짜>-design.md`

## 범위 밖
코드 수정. 타 제품의 아이콘·이미지·문구 복제.

## 진행 단계
- [ ] 1. 레퍼런스 수집
- [ ] 2. 현재 화면 캡처 비교
- [ ] 3. 개선안과 우선순위

## 재개 위치
1단계부터. 화면 캡처는 Claude가 `npm run review:ui`로 만들어 `docs/ui-review/`에 제공할 수 있다.

## 테스트 상태
문서 과제 — 해당 없음.

## 검증 기록
