---
id: TASK-REVIEW-A11Y-02
title: A11Y-02 입력·상태 안내·키보드·좁은 화면 독립 검증
status: in-progress
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
- [ ] A11Y-02 완료 조건과 코드·실제 앱·독립 화면 검사를 대조
- [ ] npm test 및 npm run test:desktop 재실행, 정확한 Windows 소스/패키지 로그 확인
- [ ] 발견·보완·한계를 한국어로 기록하고 체크포인트 푸시·검토용 PR·인계

## 범위 밖
기관 NVDA/실제 Windows 고대비 테마의 실기기 승인, main 병합, 용어·스키마·서식 정책 결정.

## 진행 단계
- [x] 1. 최신 원격1e22ac6·A11Y-02 조건 확인, 검증 브랜치 선점
- [x] 2. Node24 기준선·독립 키보드/상태/고대비·좁은 화면 검증
- [x] 3. 발견 시 실패 회귀부터 추가하고 최소 보완·재검증
- [ ] 4. Windows·전후 화면·검증 결과·인계 푸시

## 재개 위치
2026-10-19 환경 연결 복구. 이전 미커밋 코드/테스트는 /workspace/recovery/a11y02-20261019의 patch·tar로 검증 보존했다. 원격에는 Claude가 알림2건과 타이머 경쟁 조건을 이미 보완했으므로, 이전 Codex 구현을 적용하지 않고 cc4349a(실행 코드는c510a1b) 기준으로 검증했다.

새로 재현한 P2: A→알림→B→알림 재진입→닫기에서 B 대신 A로 돌아감. main.tsx의 onFocus를 바깥에서 진입할 때마다 복귀 대상으로 갱신하고, onBlur도 바깥으로 나갈 때만 타이머를 재개하게 보완했다. desktop-a11y-smoke에 실제 Tab 재진입 회귀를 추가했고 보완 전 실패·후 통과했다.

다음은 본 보완 소스의 Windows dispatch·각 소스/패키지 PASS 확인, 최종 검증/작업기록/인계·PR이다. LIST-02는 Claude 구현 중(cc4349a 착수)이며 중복 구현하지 않는다. 완료 커밋이 공유되면 해당 기준을 독립 검증한다.

## 테스트 상태
- 원격 cc4349a: Node24 단위91/91·desktop10·UI150/실패0/오류0/외부요청0 통과. Windows39184184786의 단위91·소스10/패키지9 및 A11Y 양쪽 PASS, 예외0·NSIS/portable·체크섬·artifact12156928416 확인.
- 복구 후 재진입 probe: 전 returnedToLatest=false/returnedToOld=true, 후 true/false. 새 회귀도 '재진입 후 가장 최근 위치로 포커스 복귀'에서 전 실패·후 통과.
- 보완본: Node24 npm test91/91·test:desktop10 통과. 독립 추가 검사에서 입력 대비 실계산·상시영역 identity/재안내·8초·실제 Tab/Enter·두 줄 높이/당직/거점·고대비 통과. 독립 시계 검사는 저장 파일 완료와 새 안내 반영을 따로 기다린다.
- 보완본 Windows는 다음 단계. NVDA·기관 고대비 테마 실기기 미실행.

## 검증 기록
Claude 보완의 핵심 알림2건과 seq 경쟁 조건 가드는 코드/실제 앱에서 확인했다. 별도 검증자는 재진입 복귀 P2를 정적 확인했고 루트가 실제 재현했다. 본 추가 보완 작성자는 Codex이므로 Claude 교차 확인을 요청한다. main 미병합.
