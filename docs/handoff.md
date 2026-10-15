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

## 진행 중: TASK-UX-01 / TASK-OFFICE-01

사용자 피드백: 전반적 화면·기능 완성도 부족. 제품 안의 참고 프로젝트/개발 설명 제거. 조직·직원·거점·휴무/당직/숙직을 연결한 사무소 현황판 구현 요청.

- UX Step: 브리핑 실무 화면, 빠른 기록, 날짜별 원본 일정/업무, 전화·메모, 입력 상단 저장, 검색 단축키, 접근 가능한 메뉴, 안내문 정리 완료. npm test 13/13, test:desktop 통과. 즉시 푸시.
- 다음 UI Step: 조직/직원/거점 등록 및 일자별 기본 근무 + 별도 주간당직/숙직. 구버전 원본 보관 후 새 스키마로 전환, 수동 등록 지원. ERP 열 이름과 기관 구분을 사용자에게 질의했고 기본안으로 진행한다. 자동 ERP 접속이나 기관 공용 서버는 연결하지 않는다.
- 모델 설계 참고(코드/화면 재사용 없음): Microsoft Shifts의 직원 ID 참조, 근무/휴무·그룹 분리 및 Microsoft To Do의 업무-원본 연결. 출처: https://learn.microsoft.com/en-us/graph/api/resources/schedule?view=graph-rest-1.0 , https://learn.microsoft.com/en-us/graph/api/resources/shift?view=graph-rest-1.0 , https://learn.microsoft.com/en-us/graph/api/resources/todo-overview?view=graph-rest-1.0 . 제품 UI에는 참고 문구를 넣지 않는다.

## TASK-OFFICE-01 Part A 완료

자료 v3: organizations(id/code/name/parentId), employees(id/code/name/organizationId/position/active), bases(id/code/name/organizationId), assignments(id/employeeId/date/workType/duty/baseId/note). 근무와 당직 구분을 분리한다. 한 직원/날짜에 기록 하나이며 등록되지 않은 근무를 추정하지 않는다. 조직 순환·참조·날짜·중복·거점 조건을 저장 전에 검증한다. 비활성 직원도 근무가 있는 과거 날짜는 표시한다. officeRows/officeSummary는 원본에서 계산한다.

v1/v2 로드 지원, 파일 전환 시 원본 바이트를 .v1-backup.json 또는 .v2-backup.json에 최초 1회 보존한다. 브라우저도 버전별 원문을 별도 키에 보존한다. 이전 앱은 v3를 거부하므로 새 근무 데이터를 지우지 않는다. 기존 20MB/종류별 10,000건 유지. npm test 17/17, npm run test:desktop 통과.

## TASK-OFFICE-01 Part B 완료

일/주간 근무현황, 조직/직원/거점 관리, 기본근무+당직 편집 시트, 미등록·휴무·당직 필터, CSV 반입 미리보기/전체 검증/적용, 브리핑 사무소 요약 연결. 직원/조직/거점 참조가 있는 자료는 삭제하지 못하며 비활성 직원의 과거 근무를 보존한다. 직원번호 또는 코드로 업데이트해 UUID를 유지한다. UI의 참고 프로젝트/개발 방향 문구를 제거했다.

사용자는 ERP 열·근무 코드·조합·운영 범위를 **미확인**으로 답변했다. docs/erp-integration.md에 표준 CSV 계약과 실제 ERP 매핑 대기 상태를 기록했다. ERP/공용 서버 자동 조회는 구현하지 않았다. 현황은 날짜별 근무 + 현재 직원 소속이며 과거 인사 소속 이력은 미구현이다. 자동 편성·법령/장부·암호화는 별도 백로그다.

npm test 19/19, test:desktop 통과. 1280×800/960×800 화면 확인. Windows v0.4 검증 성공: 소스 bd74297a36ac9c025105a334339007b375296cef, 실행 https://github.com/Recon987/AI-Coding/actions/runs/38745960865 . npm test 19/19, 소스 및 패키징된 EXE 스모크, NSIS/portable 및 체크섬 업로드 통과. 다운로드 https://github.com/Recon987/AI-Coding/actions/runs/38745960865/artifacts/11978616999 (GitHub 로그인, 보관 14일). Part B 푸시: b79e8a07894bc5dfc8214e3096884b3f4e123eb7. 좁은 창에서 직원 이름·수정 버튼을 고정하는 후속 배치 수정도 두 검사를 통과했다. 앞 단계 모델 푸시 619b7bc53fea0e0886dffd70bf2113c7e5cf81f1.

## 최신 인계 패킷

해시는 작성 직전 확인한 원격 기준이다. 문서 포함 최종 해시는 응답 패킷/git log -1로 확인한다.

### [GEMINI_HANDOFF_PACKET]
- **Repository & Branch**: Recon987/AI-Coding (main)
- **Latest Pushed Commit**: bd74297a36ac9c025105a334339007b375296cef - fix: keep roster edit actions visible in narrow windows (TASK-OFFICE-01)
- **Completed Steps & Modified Files**: UX·OFFICE 모델 푸시 완료. Part B: shared/office-import.*, components/{Office,OfficeDirectory,OfficeImport,Sheet,Briefing,Icon}.tsx, src/{main,types,ui,style}, tests/{office.test,desktop-smoke}.cjs, package*.json, README·architecture·validation·erp-integration·handoff 및 화면 이미지.
- **Changed Interfaces / Schema Diff**: 앱 0.4.0 / Data v3. previewOfficeImport/parseCsv/importColumns 및 표준 CSV 계약. 새 IPC/외부 의존성 없음. v1/v2 자동 백업 전환 유지.
- **Test Status**: npm test 19/19, npm run test:desktop 통과. Windows v0.4 npm test 19/19, 소스 및 패키징된 EXE 스모크 통과. 실행 파일 업로드 완료.
- **Remaining Work for Gemini**: 실제 ERP 열·코드·근무 조합 매핑(사용자 미확인), 인사 소속 이력/공용 서버·편성 규칙은 별도 설계. Windows 검증 완료. 후속 우선순위는 ERP 매핑 확인, 인사 이력, 편성 규칙/공용 서버, 암호화 및 기존 도구 확장.
- **Modified Code Snippets (if uncommitted)**: 코드 모두 푸시 완료. 이번 후속 커밋은 README/validation/handoff의 검증 증빙만 갱신한다. 미완성·미커밋 코드 없음.
