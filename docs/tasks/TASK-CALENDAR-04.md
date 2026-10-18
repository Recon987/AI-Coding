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
- [ ] 3. 툴바·2열·격자 로빙/날짜·기록 포커스 구현
- [ ] 4. 독립 검토·실제 앱·화면·Windows 검증과 인계

## 재개 위치
월간 MonthGrid·주간 WeekView·목록 ListView를 src/components/calendar로 분리했다. 기존 표시/ID/클래스/편집·회차 동작은 유지한다. 다음은 툴바·900px 이상2열·월간 날짜 격자 로빙/Enter 기록 포커스다. 루트가 style.css와 Calendar/MonthGrid, 실제 앱 회귀를 이어서 구현한다. 분담 에이전트는 workspace 크레딧 부족으로 중단되어 재개 전 완료로 가정하지 않는다. 기반은 검증20978d1(PR #6)이며 원 브랜치/main 직접 수정 없음.

## 테스트 상태
분리 단계: npm test91/91·npm run test:desktop8진입점·기존 UI142/오류0/외부요청0 모두 통과. 증빙 /tmp/park-workdesk-review/calendar04-extracted. 새 툴바/키보드 구현은 아직 미착수. 기반 Windows39110892545 성공과 구분.

## 검증 기록
설계·구현·실제 앱 검사·독립 UX/자료 검토 역할을 나눠 검토한다. 원 브랜치/main에 직접 쓰지 않는다. 저장 자료v3·반복 규칙 변경은 범위 밖이다.
