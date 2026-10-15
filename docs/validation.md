# 검증 결과 — 2026-10-15 (한국 시간)

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
