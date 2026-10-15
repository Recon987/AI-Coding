# Codex ↔ Gemini 인계장

갱신 기준: 2026-10-15 (한국 시간). 저장소: Recon987/AI-Coding, 작업 브랜치: main.

## v0.2 기준선

- 원격 기준: `0f40e2ab9be281721b4e32378f53c5db4e76288e` — Document verified Windows v0.2 build and artifacts.
- 독립 구현한 Electron/React 앱: 순찰→인수인계, 제출 기한, 월간 일정, 전화/메모, 통합 검색, TXT 브리핑, 백업·복원.
- 데이터 v2: `notes`, `events`, `calls`, `folders`, `patrols`, `tasks`. v1 전환 시 원본 백업 보관. 전체 20MB, 기록 종류별 10,000건.
- 원본 데이터에서 달력·브리핑을 계산한다. Electron renderer sandbox/contextIsolation을 유지한다.
- v0.2 Linux 및 Windows 데이터 테스트 9개, 소스·패키징된 Electron 동작 검증 통과. Windows 실행 증빙: https://github.com/Recon987/AI-Coding/actions/runs/38701817780
- 현재 자료는 평문. 트레이 상주·공휴일·반복 일정·법령/ERP 연결은 없다. 코드/기관 자료/암호화 인증을 과장하지 않는다.

## 현재 과제: TASK-v0.3-01 — 오프라인 좌표 표기 변환

범위는 위도·경도의 Decimal Degrees(DD) ↔ Degrees/Minutes/Seconds(DMS) 표기 변환이다. 위도 ±90°, 경도 ±180° 및 DMS 성분·반구 조합을 검증한다. 투영좌표계(EPSG 간 변환), 지도, 지오코딩, GPS 자동 수집은 범위 밖이다.

- **Step 1**: AGENTS.md와 본 인계장 생성. 기존 두 테스트 명령을 통과시킨 후 즉시 푸시.
- **Step 2 / Part A**: shared/model.mjs 및 선언 파일에 순수 변환/검증 함수, 선택적 순찰 좌표 필드 검증 추가. 기존 v0.2 순찰은 그대로 읽힌다. tests/store.test.cjs에 정확도·오류·호환성 검증 추가 후 두 검사 통과·즉시 푸시.
- **Step 3 / Part B**: src/types.ts와 순찰 UI의 DD/DMS 양방향 입력·즉시 표시·검색, 브리핑 화면/TXT의 선택 좌표 표시, 실제 Electron 스모크 테스트. README/validation/인계장 갱신, 두 검사 통과·즉시 푸시.

Part A 구현: `coordinates?: {latitude: number; longitude: number} | null`. 저장 원본은 DD, DMS는 파생값이다. 누락/null은 좌표 없음이며 0도와 혼동하지 않는다. 데이터 포맷 v2를 유지한다. `validateCoordinates(input)`, `decimalToDms(value, axis)`, `dmsToDecimal(input, axis)`를 제공한다. axis는 latitude/longitude, DMS는 degrees/minutes/seconds/hemisphere(N/S/E/W). 초 소수 6자리로 반올림하고 자리올림하며, 왕복 오차는 1.4e-10도 이내. 잘못된 값은 예외로 거부한다. Part B에서 TypeScript Patrol 필드와 UI 연결 완료. `formatCoordinates(input, format?: "dd" | "dms")`는 목록·검색·브리핑 공통 표시를 제공한다.

## 후속 백로그

1. 좌표 기능: v0.3-01 DD/DMS 완료. 실제 업무 좌표계 수요 확인, EPSG 변환은 별도 TASK.
2. 로컬 암호화: Windows 계정 보호, 키 복구, 암호 기반 이동 백업, 원본 보존 마이그레이션.
3. 트레이 상주: 종료 정책, 중복 알림 방지, 절전 복귀·다시 알림.
4. 달력 공휴일·반복 일정: 오프라인 데이터 범위, 예외/수정/완료 처리 모델.
5. 법령 오프라인 검색: 공식 수집→서명/해시 반입 검증→시행일·개정 비교.
6. 행정 장부: 기관 서식에 맞춘 예산·급량비·물품, 담당/승인/마감.
7. 거점표·당직·공용 현황판: 편성 규칙과 ERP 읽기 권한 확인 후 별도 설계.

## 최신 검증 기록

Step 1 커밋·푸시 완료: b8711cf942d8244d8cc88787bd423e5be5a2cee5.
Step 2 커밋·푸시 완료: 501dd3928fd647dabe5c2e4ee045aa27f412a889.
Step 2 / Part A: npm test 12/12 통과; npm run test:desktop 통과. 추가 3개 테스트는 DD/DMS 정확도·자리올림, 잘못된 좌표 거부, v0.2 누락/null·0도·유효 좌표 왕복 및 잘못된 저장 시 원본 보존을 검증한다.

Step 3 커밋·푸시 완료: bfc64f135cf4b79021280212cea3a3d9658ecf01.
Step 3 / Part B 완료: npm test 13/13 및 npm run test:desktop 통과. CoordinateInput의 부분 입력·범위 오류 저장 차단, DD/DMS 실시간 변환, 수정·검색·좌표 제거, 브리핑 화면·TXT, 백업·복원·재실행 검증 완료. 앱 0.3.0 / 자료 v2. README/validation 갱신·푸시 완료. 이번 문서 후속 커밋은 검증 증빙만 추가한다.
Part A Windows CI 성공: https://github.com/Recon987/AI-Coding/actions/runs/38739135156 . Part B Windows CI도 성공: https://github.com/Recon987/AI-Coding/actions/runs/38740063182 . 단위 테스트 13/13, 소스 및 패키징된 Electron 스모크 통과. 설치형/portable 0.3.0 및 SHA256SUMS: https://github.com/Recon987/AI-Coding/actions/runs/38740063182/artifacts/11976441150 (GitHub 로그인, 보관 14일).

## 최신 인계 패킷

문서의 Latest Pushed Commit은 작성 직전 확인한 원격 기준이다. 이 문서를 포함한 Step의 최종 해시는 응답 패킷 및 `git log -1`을 확인한다. 자기참조 해시를 추측해서 넣지 않는다.

### [GEMINI_HANDOFF_PACKET]
- **Repository & Branch**: Recon987/AI-Coding (main)
- **Latest Pushed Commit**: bfc64f135cf4b79021280212cea3a3d9658ecf01 - feat: integrate patrol coordinates and briefing (TASK-v0.3-01 Part B)
- **Completed Steps & Modified Files**: Step 1~3 푸시 완료: shared/model.*, src/types.ts, src/components/{CoordinateInput,Patrols,Briefing}.tsx, src/main.tsx, src/style.css, tests/{store.test,desktop-smoke}.cjs, package*.json, README.md, docs/{validation,handoff}.md.
- **Changed Interfaces / Schema Diff**: Patrol.coordinates?: Coordinates | null; formatCoordinates(input, format?) 공통 표시 추가. 기존 변환 함수 유지. 새 IPC/의존성 없음. 앱 0.3.0, 자료 v2.
- **Test Status**: npm test 13/13, npm run test:desktop 통과. Part B Windows에서도 두 검사 통과 및 패키징된 EXE 스모크 통과. 다운로드 업로드 완료.
- **Remaining Work for Gemini**: 요청한 Step 1~3 및 Windows 검증 완료. 기관 실기기에서 설치/알림/DPI/보안 프로그램 확인 필요. 다음 과제는 위 백로그에서 선택(암호화/트레이/법령 등); EPSG 변환과 혼동하지 말 것.
- **Modified Code Snippets (if uncommitted)**: 미완성 코드 없음. 이 증빙 갱신은 docs/handoff.md와 docs/validation.md만 변경하여 커밋·푸시한다.
