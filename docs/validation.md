# 검증 결과 — 2026-10-16 (한국 시간)

## TASK-DATA-01 / 자료 손상 복구 (미병합, 2026-10-16)

- Linux Node 22: `npm test` 47/47 (recovery.test.cjs 7개: 마지막 정상본 갱신 범위, 정상 파일 무변경, 손상·빈 파일·20MB 초과·잘못된 백업·보관 실패), `npm run test:desktop` 통과(신규 desktop-recovery-smoke: 실제 Electron에서 손상 파일 보관 → 복구 대화상자 → 마지막 정상본으로 시작 → 자료 표시).
- 시작 전 대화상자는 개발용 Electron의 `-r` 옵션으로 테스트 스텁을 주입해 응답한다. 패키징된 EXE에는 이 옵션이 없어 Windows 패키지 스모크는 이 시나리오를 실행하지 않는다.
- Windows Actions·실기기 정전 시험은 미실행.

## v0.6.1 / TASK-UX-03

세 분야 독립 검토·직접 협의·상대 교차 검토를 거쳐 첫 사용 흐름·날짜/시간·달력을 개선했다. npm test **37/37**, npm run test:desktop **통과**. 첫 사용3행동·부분자료 보존·달력 접근 이름을 실제 Electron에서 검사했다. 서울/뉴욕 날짜·자정·윤일·연말 변환도 검증했다. UI 검사는 before83개, after134개 통과, 페이지 오류0·외부요청0. 동일 가상 자료/임시프로필/4해상도·확대 조건과 전후 증빙은 [검토 기록](review-rounds/TASK-UX-03.md)에 있다. 소스 `887ca68b46dba8792f0c944fa7e5f785f8baf97e`의 [Windows Actions38844487365](https://github.com/Recon987/AI-Coding/actions/runs/38844487365)는 성공했다. 잠금 설치·37개 검사·소스 Electron·설치형/portable 빌드·패키징된 EXE의 확장 스모크·SHA256SUMS·업로드 모두 통과했다. [v0.6.1 다운로드](https://github.com/Recon987/AI-Coding/actions/runs/38844487365/artifacts/12023060736), GitHub 로그인·보관14일. 이번 증빙 후속 커밋은 문서만 수정한다.

## v0.6.0 / TASK-TRAY-01

검증 소스: `50f78366a62c67314d3423e023e9b25faae06374`. [Windows Actions 38827813053](https://github.com/Recon987/AI-Coding/actions/runs/38827813053)는 3분 1초에 성공했다. Node24 잠금 설치, npm test **35/35**, 소스 Electron 스모크, NSIS·portable 생성, 패키징된 win-unpacked EXE의 동일 스모크, SHA256SUMS 생성과 업로드가 모두 통과했다. Windows 두 스모크에서는 실제 Tray 생성·닫기 숨김·복원·설정 재실행 보존을 필수로 실행했다. Native OS 토스트 자체와 실제 PC 절전은 자동 검증하지 않았다.

[park-workdesk-windows-14 다운로드](https://github.com/Recon987/AI-Coding/actions/runs/38827813053/artifacts/12015459007): `공원 업무 수첩 Setup 0.6.0.exe`, `공원 업무 수첩 0.6.0.exe`, `SHA256SUMS.txt`. GitHub 로그인 필요, 보관 14일. 이 증빙 후속 커밋은 문서만 수정한다.

Gemini 기준 c32d590(v0.5.0/TASK-CALENDAR-01)에서 npm test22/22 및 test:desktop을 먼저 통과시켰다. UI 통합8af114d도 두 검사 및 Windows 소스/패키지 검증을 통과했다([Actions38826904918](https://github.com/Recon987/AI-Coding/actions/runs/38826904918)).

이번 변경의 Linux Node24: npm test **35/35**, npm run test:desktop **통과**(TypeScript/Vite 포함). 설정 검증·손상 보존·저장 실패·트레이 생성 실패·종료 취소/승인·정상60초/resume24시간 경계·중복/완료/미래 제외·요약·표시 실패 재시도를 순수 정책 테스트로 검증했다. 독립검토에서 발견한 오래된 복귀알림 실패의 일반타이머 재시도 누락도 수정했다. 제한된 pending집합은 매번 현재원본·완료·삭제·변경·만료를 검증하고 이전시도의지연실패가새성공을지우지않게한다. DST전환은 별도 America/New_York 자식프로세스에서23/25시간 날짜와09:30현지시각유지를 확인한다. 기존+09:00 고정fixture를 사용한 전체store테스트의 뉴욕탐색실행은 날짜가전일로변해 실패했으며, 제품은PC현지시각계약이다. 실제 Electron에서는 preload설정·엄격bool거부, powerMonitor resume 연결, 오래된 반복과 제출 사전알림, OS표시요청대역, 재실행 후 이력/원본보존, 미저장 종료 취소 후 초안 유지와 승인 종료를 검증했다.

Linux headless에는 화면 서버가 없어 nativeTray생성은 GTK프로세스 중단을 일으킨다. 이를 성공으로 기록하지 않는다. 실제트레이 생성/닫기숨김/두번째실행복원/알림클릭복원/설정영속은 Windows 소스 및 패키지 스모크에서 필수 실행한다. OS Notification.show와 종료 확인 widget은 결정적 테스트 대역이며 실제 토스트 노출·PC절전은 기관 Windows실기기에서 별도 확인한다. Windows 결과는 아래에 기록한다.

수동 확인: 앱안내에서 트레이를 켠 뒤 미저장 작성 중 X → 창 다시열기에서 초안유지 → 트레이종료에서 계속작성/종료 두 선택 → 재시작 설정유지 → 절전동안 지난일정/제출사전알림 생성 후 복귀·반복복귀 중복없음 → Windows알림센터 확인. 종료중 알림/자동시작은 제공하지 않는다.

## v0.5.1 / 독립 UI 검토 루프 + 달력 통합

원격 c32d590 (Gemini TASK-CALENDAR-01) 기준선에서 npm test 22/22와 npm run test:desktop 통과 후 진행했다. UI 변경과 공휴일/반복 일정 필드를 통합했으며 자료 v3/기존 IPC를 유지한다. 최종 npm test 22/22, npm run test:desktop 통과. 추가 회귀는 검색 중 초안 보존·초기 입력 focus·닫기 거부·실패 IPC 저장 시 입력 유지다. 파일/확인창 UI만 결정적으로 대체한다.

[UI 검토 기록](ui-review-loop.md): 같은 가상 자료·3종 창 크기와125%에서 83개 실제 화면 측정 통과, 페이지 오류0/외부요청0. Windows 새 빌드는 푸시 후 확인한다.

## v0.5 / TASK-CALENDAR-01 (Gemini 릴레이 구현)

- 단위 검증: `tests/store.test.cjs` 및 `tests/office.test.cjs` 총 **22/22** 통과 (`store.test.cjs` 16개 + `office.test.cjs` 6개).
- 반복 일정 검증: `none | daily | weekly | monthly | yearly` 및 `repeatUntil` 검증, 원본 복제 없이 기간별 회차 파생(`expandEventOccurrences`), 월말(`2026-01-31` → `2026-02-28` → `2026-03-31`) 및 윤년(`2028-02-29` → `2029-02-28`) 보정, 잘못된 반복 주기·비반복 종료일·시작일 이전 종료일 거부, 기존 `v3` 단일 일정의 바이트 단위 무손실 왕복 저장 확인.
- 오프라인 공휴일·대체공휴일 검증: 양력 법정공휴일 및 2025~2035년 음력 공휴일(설날 연휴·부처님오신날·추석 연휴)과 공휴일법 시행령 기준 대체공휴일(`2026-03-02`, `2026-05-25`, `2026-08-17`, `2025-05-06`, `2028-10-05` 등) 계산, 월간 달력 배지 및 브리핑 TXT 표출 확인.
- Codex 확인: Node 24에서 `npm run test:desktop` 통과. Windows Actions 패키징(`windows-build.yml`) 실행 확인.

## v0.4 / TASK-OFFICE-01

- Linux Node 24: npm test **19/19**, npm run test:desktop **통과**. TypeScript 및 프로덕션 빌드 포함.
- 실제 Electron에서 조직→직원→거점 등록, 거점근무+숙직 동시 저장, 주간표에서 원본 수정, CSV 파일 선택→미리보기(저장 안 함)→적용, 잘못된 소속 반입 거부, 휴무 등록, 참조 직원 삭제 차단, 새 조직/근무 전체 백업·복원 및 프로세스 재실행 보존을 검증했다.
- v2 원본 자동 백업→v3 반복 안전 전환, 조직 순환·중복 코드·깨진 직원/거점 참조·중복 날짜 거부, 미등록/비활성 직원 현황, BOM·따옴표·줄바꿈 CSV 및 수정 시 내부 UUID 보존을 단위 검증했다.
- 1280×800 및 960×800 실제 화면을 가상 자료로 확인했다. 입력 필드와 라벨을 명시적으로 연결해 모달 편집/보조기술 인식을 개선했다.
- Windows 소스 `bd74297a36ac9c025105a334339007b375296cef`: [실행 38745960865](https://github.com/Recon987/AI-Coding/actions/runs/38745960865) 성공(2분 12초). 잠금 설치, npm test 19/19, 소스 Electron 스모크, NSIS/portable 생성, 패키징된 win-unpacked EXE에서 동일 확장 스모크, SHA256SUMS 및 업로드 모두 통과했다.
- [park-workdesk-windows-8 다운로드](https://github.com/Recon987/AI-Coding/actions/runs/38745960865/artifacts/11978616999): Setup 0.4.0.exe / portable 0.4.0.exe / SHA256SUMS.txt. GitHub 로그인 필요, 보관 14일.
- 기관 ERP 열·근무 코드와 실기기 운영은 미확인이다. 이 증빙 후속 커밋은 문서만 수정하며 위 소스 검증을 기록한다.

## v0.3.1 사용 흐름 개선

Node 24 Linux에서 npm test 13/13 및 npm run test:desktop 통과. 기존 데이터·좌표·백업 시나리오에 검색 키보드 단축키와 미완료 건수가 있는 메뉴 이동 검증을 추가했다. 1280×800 실제 Electron 화면에서 브리핑과 입력 양식 배치를 확인했다. Windows 빌드는 이 소스 푸시 후 확인한다.

## v0.3 / TASK-v0.3-01

- Step 1: 협업 문서 추가, npm test 9/9 및 npm run test:desktop 통과 후 푸시.
- Part A: `501dd3928fd647dabe5c2e4ee045aa27f412a889`, npm test 12/12 및 npm run test:desktop 통과. [Windows 소스·패키징 검증도 성공](https://github.com/Recon987/AI-Coding/actions/runs/38739135156).
- Part B: `bfc64f135cf4b79021280212cea3a3d9658ecf01` 소스에서 Linux Node.js 24, npm test **13/13**, npm run test:desktop **통과**. TypeScript 검사와 Vite 프로덕션 빌드 포함. 실제 Electron 화면의 DMS 입력 배치도 확인했다.
- Part B [Windows 실행 성공](https://github.com/Recon987/AI-Coding/actions/runs/38740063182): Node.js 24 잠금 설치, npm test **13/13**, npm run test:desktop 통과, NSIS/portable 빌드 및 패키징된 `win-unpacked/공원 업무 수첩.exe`의 동일 스모크 테스트 통과(2분 8초).
- `공원 업무 수첩 Setup 0.3.0.exe`, `공원 업무 수첩 0.3.0.exe`, `SHA256SUMS.txt`를 [park-workdesk-windows-4 다운로드](https://github.com/Recon987/AI-Coding/actions/runs/38740063182/artifacts/11976441150)로 제공한다. GitHub 로그인 필요, 보관 14일.
- 검증 증빙 추가 커밋은 문서만 변경한다. 위 소스 해시의 Linux/Windows 결과를 기록하며 기관 실기기 검사와 구분한다.

추가 검증: DD/DMS의 양쪽 반구·0·±90/180 경계·소수 초·자리올림; NaN/Infinity/문자·범위·DMS 방향 오류 거부; 좌표 없는 v0.2와 null/0도/유효 좌표 저장 왕복; 잘못된 좌표 저장 시 기존 파일 보존. 브리핑은 좌표 변경·제거를 순찰 원본에서 반영한다.

Electron 시나리오: DD 부분 입력/181도/16진수 오류 차단 → DD 저장 → DMS 표시·형식 전환 → 순찰/통합 좌표 검색 → 백업·복원에서 좌표 유지 → DMS 분 60 거부 → S/W 좌표 수정 → 화면·미리보기·TXT 대조 → 좌표 없는 기록 등록 → 0도 저장 → 좌표 지우기 → 프로세스 재실행 보존. 기존 인계·제출·달력·전화·메모·복원 오류·폴더 시나리오도 함께 통과했다. 임시 프로필과 가상 자료만 사용했다.

좌표계/EPSG 변환이나 지도 위치 정확도는 검사 대상이 아니다. 새 외부 패키지·API·IPC는 추가하지 않았으며 renderer 보안 설정, 저장 한도·백업 정책은 그대로다.

## v0.2 기준선 검증 결과 — 2026-10-15 (한국 시간)

검증한 소스 커밋: `93faf101181ff52698d1f69add71b21a1e58bd90`.

[Windows 빌드 실행](https://github.com/Recon987/AI-Coding/actions/runs/38701817780)

### 통과

- Linux 클라우드: Node.js 24, 데이터 테스트 9개, TypeScript/프로덕션 빌드, 실제 Electron 업무 시나리오.
- GitHub Windows 러너: 잠금 의존성 설치, 데이터 테스트 9개, 소스 실행 Electron 업무 시나리오.
- Windows 패키징: `공원 업무 수첩 Setup 0.2.0.exe`와 `공원 업무 수첩 0.2.0.exe` 생성.
- 패키징 후 `win-unpacked/공원 업무 수첩.exe`에서 동일한 업무 시나리오 실행. 번들된 화면·preload·공유 데이터 모듈을 실제로 로드하고 저장·재실행 확인.
- SHA256SUMS 생성, [Artifacts 다운로드](https://github.com/Recon987/AI-Coding/actions/runs/38701817780/artifacts/11955804897) 업로드 완료. 로그인 필요, 보관 14일.

업무 시나리오: 메모/전화 등록, 순찰→인계 연결과 중복 방지, 제출 기한과 달력 원본 연계, 통합 검색, 완료 일시, 백업·복원, 잘못된 순찰 참조의 복원 거부, 브리핑 TXT, 프로세스 종료/재실행 보존, 폴더 등록. 파일 선택/확인 대화상자만 테스트에서 대체했다.

### 별도 확인 필요

NSIS 설치 마법사 및 portable 바깥 실행기의 실기기 실행, Windows 10, 기관 보안 프로그램, 실제 OS 알림 표시·집중 지원, 탐색기 실행, 높은 DPI와 다중 모니터. 자동 검증은 기관 배포 승인을 뜻하지 않는다. 코드 서명 및 저장 암호화는 미구현이다.

첫 Windows 실행은 electron-builder의 자동 게시 동작 때문에 빌드 마지막에 실패했다. `--publish never`를 명시하고 NSIS/portable 대상을 모두 지정한 뒤 위 실행에서 통과했다. 이 항목은 v0.2 당시의 검증 기록이다.
