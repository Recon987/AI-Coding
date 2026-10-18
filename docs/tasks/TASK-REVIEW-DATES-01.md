---
id: TASK-REVIEW-DATES-01
title: DATES-01 날짜 계산 단일화와 시간대 경계 독립 검증
status: review
role: verifier
owner: codex
verifier: claude
branch: task/task-review-dates-01
depends:
priority: P2
updated: 2026-10-18
---

## 배경
Claude 인계75f04e9의 TASK-DATES-01을 독립 검증한다. 이전 EDITOR 보완이 원 브랜치에 포함됐고 정확한75f04e9의 Windows39107140819 성공을 확인했다. 원 브랜치/main을 직접 수정하지 않는다.

## 완료 조건
- [x] dates 함수·선언·검증 정책·기존 코드의 동작 대조
- [x] 달력·브리핑·사무소·양식·단속 집계 연동 확인
- [x] Node24 단위·시간대·실제 앱·화면·Windows 증빙 확인 및 필요 보완
- [x] 한국어 검토/작업 기록·인계·커밋·푸시

## 범위 밖
CALENDAR-04의 화면 개편, 새 스키마/암호화 정책·서버 연동·main 직접 병합.

## 진행 단계
- [x] 1. 최신 원격·카드·인계·환경 확인 및 검증 선점
- [x] 2. 날짜 경계·자료·화면 연동 독립 검토와 전체 검사
- [x] 3. 발견 재현·보완·교차 재검토
- [x] 4. 최종 증빙·푸시·인계

## 재개 위치
2026-10-18 Claude가 확인·통합(PR #7 경유 fast-forward). main 병합 시 done.

## 테스트 상태
- 기준75f04e9: Node24 단위91/91을5TZ 각각 통과, 전체Electron·UI142/오류0/외부요청0·흐름11/11 통과. Windows39107140819 성공 조회.
- 소규모월말 회귀: 수정 전 실패→수정 후 통과. 0000/0001/0099/0100년 월말을5TZ에서 확인.
- 보완본: npm test91/91을5TZ 각각 통과, npm run test:desktop8진입점·UI142·흐름11/11 통과.
- 독립: 자료1800회 교차 시간대 읽기·원문 보존, 모델31개/정상자료600개/일반경계2412개, 보완후 연도·월 경계132개, 실제Electron 서울/뉴욕 DST·월경계 연동 승인.
- 최초 Windows39110532993은 중간 실패가 덮여 보류. 최종 소스 `928e78e5113df5ab45d32d3c86ff6434a1d7cd3e`의 [Windows39110892545](https://github.com/Recon987/AI-Coding/actions/runs/39110892545) 성공(2분46초): 91개·소스8진입점·패키지7진입점·NSIS/portable·SHA256SUMS·업로드. 각 PASS와 오류없음 확인. [검증 빌드](https://github.com/Recon987/AI-Coding/actions/runs/39110892545/artifacts/12129919918).

## 검증 기록
DATES-01과 보완의 완료 조건을 승인하며 main 병합 전 상태를 유지한다. [독립 검토](../reviews/2026-10-18-codex-dates.md), [한국어 작업 기록](../work-log/2026-10-18-codex-dates.md). 정책 변화는 시간대 없는 외부 역순 일정의 일관 거부이며 정상 기존/UI 자료의 거부 문제는 재현되지 않았다.

### Claude 확인 — 2026-10-18

Codex 보완 두 건을 확인했다. ① `periodRange("month")`가 Date.UTC의 0~99년 보정으로 연도를 바꾸던 문제 — Claude 구현의 실제 결함(현대 날짜 영향 없음), `setUTCMonth(+1, 0)` 수정과 0000/0001/0099/0100년 회귀가 맞다. ② Windows 패키지 검사 단계가 중간 실패를 놓치지 않도록 `$LASTEXITCODE` 확인, 정리 재시도 — 타당. 통합 후 `npm test` 91/91. **승인**.
