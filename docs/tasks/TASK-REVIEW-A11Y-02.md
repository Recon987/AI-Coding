---
id: TASK-REVIEW-A11Y-02
title: A11Y-02 입력·상태 안내·키보드·좁은 화면 독립 검증
status: review
role: verifier
owner: codex
verifier: claude
branch: task/task-review-a11y-02
depends:
priority: P1
updated: 2026-10-19
---

## 배경
사용자가 전달한 Claude1e22ac6의 TASK-A11Y-02 검증 요청. 원 브랜치/main을 수정하지 않고 현재 체크아웃에 검증 브랜치를 만든다.

## 완료 조건
- [x] A11Y-02 완료 조건과 코드·실제 앱·독립 화면 검사를 대조
- [x] npm test 및 npm run test:desktop 재실행, 정확한 Windows 소스/패키지 로그 확인
- [x] 발견·보완·한계를 한국어로 기록하고 체크포인트 푸시·검토용 PR·인계

## 범위 밖
기관 NVDA/실제 Windows 고대비 테마의 실기기 승인, main 병합, 용어·스키마·서식 정책 결정.

## 진행 단계
- [x] 1. 최신 원격1e22ac6·A11Y-02 조건 확인, 검증 브랜치 선점
- [x] 2. Node24 기준선·독립 키보드/상태/고대비·좁은 화면 검증
- [x] 3. 발견 시 실패 회귀부터 추가하고 최소 보완·재검증
- [x] 4. Windows·전후 화면·검증 결과·인계 푸시

## 재개 위치
Claude 교차 확인 승인·claude/zen-cannon-wc1at4 통합 완료(아래 검증 기록). 남은 일: 사용자 승인 후 main 병합.

## 테스트 상태
- 원격 cc4349a: Node24 단위91/91·desktop10·UI150/실패0/오류0/외부요청0 통과. Windows39184184786의 단위91·소스10/패키지9 및 A11Y 양쪽 PASS, 예외0·NSIS/portable·체크섬·artifact12156928416 확인.
- 복구 후 재진입 probe: 전 returnedToLatest=false/returnedToOld=true, 후 true/false. 새 회귀도 '재진입 후 가장 최근 위치로 포커스 복귀'에서 전 실패·후 통과.
- 보완본: Node24 npm test91/91·test:desktop10 통과. 독립 추가 검사에서 입력 대비 실계산·상시영역 identity/재안내·8초·실제 Tab/Enter·두 줄 높이/당직/거점·고대비 통과. 독립 시계 검사는 저장 파일 완료와 새 안내 반영을 따로 기다린다.
- 보완746b478 Windows39184848329 성공: 단위91·소스10/패키지9 각각 PASS·A11Y 양쪽 PASS·예외0, NSIS/portable·체크섬·artifact12157428954. NVDA·기관 고대비 실기기 미실행.

## 검증 기록
Claude 보완의 핵심 알림2건과 seq 경쟁 조건 가드는 코드/실제 앱에서 확인했다. 별도 검증자는 재진입 복귀 P2를 정적 확인했고 루트가 실제 재현했다. 본 추가 보완 작성자는 Codex이므로 Claude 교차 확인을 요청한다. main 미병합.

별도 검증자는 최소 보완을 정적 재검토상 승인했다. 실제 실행은 루트, 최종 교차 확인은 Claude이며 구분한다. [전체 검토·화면](../reviews/2026-10-19-codex-a11y02.md).

### 2026-10-19 Claude 교차 검증 — 승인
- 코드 대조: `src/main.tsx` 알림 영역 `onFocus`는 바깥에서 들어올 때만 복귀 대상을 최신 `relatedTarget`(HTMLElement일 때)으로 바꾸고, `onBlur`는 알림 영역 밖으로 나갈 때만 타이머를 다시 켠다. 기존 일련번호 가드·`isConnected` 확인과 충돌하지 않는다. 데이터·IPC 변경 없음.
- 결함 재현: 보완 전 `src/main.tsx`로 되돌려 빌드하면 새 회귀가 `재진입 후 가장 최근 위치로 포커스 복귀`로 실패하고, 보완본에서 통과함을 직접 확인했다.
- 통합: `claude/zen-cannon-wc1at4`에 merge commit으로 통합. 통합본 검사 결과는 TASK-REVIEW-LIST-02 기록과 같다(전부 통과).
- main 병합은 사용자 승인 대기이므로 status는 review를 유지한다.
