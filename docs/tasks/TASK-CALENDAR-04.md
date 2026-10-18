---
id: TASK-CALENDAR-04
title: 달력 화면 분리(C6)·툴바와 두 열 유지(U4)·날짜 격자 키보드(A7)
status: review
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
- [x] Calendar.tsx에서 월간 격자(MonthGrid)·주간·목록을 하위 컴포넌트로 분리(동작 불변)
- [x] 툴바 [오늘][‹][›] 제목 … [월|주|목록], 1200px 이하에서도 두 열 유지
- [x] 월간 날짜 격자 role="grid"와 로빙 tabindex(화살표 이동), 선택 날짜 기록으로 포커스
- [x] `npm test`, `npm run test:desktop` 통과

## 범위 밖
반복 규칙 변경.

## 진행 단계
- [x] 1. C6·U4·A7과 교차 조건 확인, 원격 중복 작업 확인 및 선점
- [x] 2. 월간/주간/목록 하위 컴포넌트 분리와 동작 유지
- [x] 3. 툴바·2열·격자 로빙/날짜·기록 포커스 구현
- [x] 4. 실제 앱·화면·Windows 검증과 독립 검증 요청

## 재개 위치
구현·자동 검사·전후 캡처까지 끝나 **Claude 독립 검증 대기**다. [PR #7](https://github.com/Recon987/AI-Coding/pull/7)(기반 PR #6)의 C6·U4·A7 완료 조건을 대조하고 npm test/test:desktop을 재실행한다. main/Claude 원 브랜치에 직접 쓰지 않았으며 #7→#6→#1 순서로 통합한다. 최종 실행 소스86bd62c, 이후 증빙 커밋은 실행 코드를 바꾸지 않는다.

## 테스트 상태
- 분리 단계: 단위91·desktop8·UI142 통과 후5f7773b 푸시.
- 최종 Linux Node24: npm test91/91·npm run test:desktop9진입점·UI150/실패0/오류0/외부요청0·업무 흐름11/11 통과.
- 새 실제 달력 검사: 윤년·월말·연도·18개월 이동·Enter/Space·탭/편집 취소 복귀·5화면/확대 조건·저장 자료 무변경 통과. 월 격자/선택일을42일/1일로 각각 원본 조회한다.
- 최종 소스86bd62c [Windows39128793988](https://github.com/Recon987/AI-Coding/actions/runs/39128793988) 성공: 단위91·소스9/패키지8진입점 각각 PASS·예외0, NSIS/portable·SHA256SUMS·업로드. [v0.8.0 시험 빌드](https://github.com/Recon987/AI-Coding/actions/runs/39128793988/artifacts/12136379775). 앱0.8.0·데이터v3 불변. 시작 복구는 소스 전용.

## 검증 기록
구현·실제 앱 검사·UX 역할을 나눴으나 초기 의견과 표시 분리 후 분담 에이전트가 workspace 크레딧 부족으로 중단됐다. 후속 구현/검사는 루트가 수행했다. **최종 독립 승인은 미실행**이며 자동 검사 통과로 대체하지 않는다. verifier Claude가 이 카드에 검증 결과를 기록한다.

[협의 반영·제한·전후 화면](../reviews/2026-10-18-codex-calendar04.md), [한국어 작업 기록](../work-log/2026-10-18-codex-calendar04.md). 고정 높이6주 강제 압축·메뉴 이름 변경·반복 규칙 변경은 제외했다. 자료v3·IPC·백업/한도는 유지한다.
