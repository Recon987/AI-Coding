---
id: TASK-CALENDAR-04
title: 달력 화면 분리(C6)·툴바와 두 열 유지(U4)·날짜 격자 키보드(A7)
status: in-progress
role: builder
owner: codex
verifier: claude
branch: task/task-calendar-04
depends:
priority: P2
updated: 2026-10-18
---

## 배경
TASK-DATES-01에서 분리. [5개 역할 검토](../reviews/2026-10-18-panel.md)의 C6·U4·A7. 날짜 계산 통합(DATES-01) 다음에 한다.

## 완료 조건
- [ ] Calendar.tsx에서 월간 격자(MonthGrid)·주간·목록을 하위 컴포넌트로 분리(동작 불변)
- [ ] 툴바 [오늘][‹][›] 제목 … [월|주|목록], 1200px 이하에서도 두 열 유지
- [ ] 월간 날짜 격자 role="grid"와 로빙 tabindex(화살표 이동), 선택 날짜 기록으로 포커스
- [ ] `npm test`, `npm run test:desktop` 통과

## 범위 밖
반복 규칙 변경.

## 진행 단계
- [x] 1. C6·U4·A7과 교차 조건 확인, 원격 중복 작업 확인 및 선점
- [x] 2. 월간/주간/목록 하위 컴포넌트 분리와 동작 유지
- [x] 3. 툴바·2열·격자 로빙/날짜·기록 포커스 구현
- [ ] 4. 독립 검토·실제 앱·화면·Windows 검증과 인계

## 재개 위치
1~3단계 구현 완료. 월/주/목록 분리, 전체 폭 툴바, 900 CSS px 이상 두 열과 미만 한 열, 격자 로빙·화살표·Home/End·PageUp/Down·Enter/Space 기록 포커스를 구현했다. 월 격자와 선택 날짜를 각각 좁은 구간으로 원본에서 조회해 400일 넘게 떨어져도 반복 회차를 보존한다. 앱 표시는0.8.0, 데이터v3 불변. 새 실제 앱 검사를 npm 및 Windows 패키지 검사에 연결했다.

전후 화면 직접 비교 후 중복 안내/별도 버튼 줄을 제거하고 일정 추가를 툴바에 모아 한 번 더 압축했다. 최종 UI150/오류0/외부요청0·desktop9 통과. PR #7을 PR #6 위 초안으로 열었다. 다음은 최종 소스 Windows dispatch의 소스·패키지 각 PASS 로그 확인, docs/README/인계 기록과 Claude 독립 검증 요청이다. 기반20978d1(PR #6) 위에 쌓아 PR #6→Claude PR #1 순서로 통합한다. main/Claude 브랜치에 직접 쓰지 않는다. 최종 독립 검증은 Claude 대기이며 에이전트 크레딧 부족을 승인으로 처리하지 않는다.

## 테스트 상태
- 분리 단계: npm test91/91·npm run test:desktop8진입점·기존 UI142/오류0/외부요청0 통과.
- 3단계: npm test91/91·npm run test:desktop9진입점(새 calendar 포함) 통과. 새 검사는 윤년·월말·연도·18개월 이동·Enter/Space·탭/편집 취소 복귀·5화면/확대 조건·저장 자료 무변경을 확인한다.
- 최종 UI150/오류0/외부요청0 통과, 업무 흐름11/11 통과(툴바 최종 압축 전후 동작 동일). 신규 Windows는 진행 중이며 최종 압축 소스에서 추가 실행한다. 기반 Windows39110892545와 구분한다.

## 검증 기록
설계·구현·실제 앱 검사·독립 UX/자료 검토 역할을 나눠 검토한다. 원 브랜치/main에 직접 쓰지 않는다. 저장 자료v3·반복 규칙 변경은 범위 밖이다.
