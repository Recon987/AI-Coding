# 공원 업무 수첩 — Codex / Gemini 협업 기준

이 저장소의 작업은 기존 사용자 자료를 보존하며 작은 Step으로 완성한다. 작업 시작 전 `docs/handoff.md`, `README.md`, 관련 코드와 테스트를 읽고 원격 `main`과 로컬 변경을 확인한다. 다른 작업자의 변경을 덮어쓰거나 강제 푸시하지 않는다. 현재 체크아웃을 사용하며 요청 없이 별도 worktree를 만들지 않는다.

## 핵심 원칙

1. **완전 오프라인 실행**: 배포된 앱에서 외부 CDN, 외부 API, 원격 폰트, 자동 업데이트를 사용하지 않는다. 개발 의존성/Windows 빌드는 인터넷 환경에서 준비하고 실행 파일을 반입한다. 서버 연동 백로그는 별도 범위 합의 전 구현하지 않는다.
2. **Electron 격리**: renderer의 `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`를 유지한다. 파일/OS 접근은 `desktop/preload.cjs`가 명시적으로 제공하는 IPC만 사용하며 일반 파일 실행·임의 IPC를 노출하지 않는다. Linux 자동 테스트의 `--no-sandbox` 예외는 격리된 테스트 프로세스에만 적용한다.
3. **자료 호환성과 백업**: Windows 기본 저장 위치 `%APPDATA%/park-workdesk/workdesk.json`과 기존 기록을 보존한다. 형식 전환 전 원본 자동 백업, 복원 전 보호본, 원자적 저장을 유지한다. JSON 전체 **20MB**, 각 기록 종류 **10,000건** 한도를 유지한다. 잘못된 입력은 파일을 쓰기 전에 거부한다. 선택 필드 추가는 구버전 자료에 필드가 없어도 정상 로드되어야 한다. 기후노트 데이터에 자동 접근하거나 가져오지 않는다.
4. **원본 단일 참조**: 달력과 브리핑은 `shared/model.mjs`를 통해 순찰·업무·일정 원본에서 파생한다. 동일 업무를 별도 일정에 복제하지 않는다. 순찰-인계 참조와 완료 상태를 검증한다. 공유 순수 로직은 DOM, Electron, 네트워크에 의존하지 않는다.
5. **작은 Step과 인계**: 작업을 작은 Step으로 쪼갠다. 각 Step에서 `npm test`와 `npm run test:desktop`을 통과시킨 뒤 `docs/handoff.md`를 갱신하고 즉시 커밋·원격 푸시한다. 테스트 실패/불가를 통과로 기록하지 않는다. 한도나 외부 차단으로 멈추면 가능한 보존 작업을 하고 정확한 상태와 미커밋 diff를 남긴다. 매 응답 말미와 `docs/handoff.md`에 `[GEMINI_HANDOFF_PACKET]`을 기록한다. Step 완료 시 실제 푸시 해시·변경 인터페이스·검증 결과·남은 작업을 명시한다.

## 구현·검증 규칙

- TypeScript 타입, 공유 모델, 저장 검증, 백업, UI, 테스트가 같은 계약을 사용해야 한다. 기존 데이터의 임의 삭제·재생성·손실성 정규화를 금지한다.
- 개발 기준은 Node.js 24, 의존성은 `npm ci`로 잠금 설치한다. 인증서/체크섬 검증을 끄지 않는다. 앱의 자료·백업은 현재 평문이므로 가상 자료로 검증한다.
- 현재 데이터 포맷은 v2다. 앱 표시 버전과 데이터 스키마 버전을 혼동하지 않는다. 선택 좌표는 위도/경도의 각도 표기 변환이며 투영좌표계 변환이나 GPS 수집으로 표현하지 않는다.
- 기후노트는 사용성 참고 자료다. 현재 앱은 독립 코드·화면·아이콘으로 개발한다. 원본 GPL 코드·자산을 가져올 경우 재사용 범위와 의무를 별도로 검토·기록한다.
- 검증은 `npm test`, `npm run test:desktop`; Windows 패키징은 `npm run package:win`. 자동 게시를 켜거나 토큰을 코드에 넣지 않는다. Windows Actions 결과와 기관 실기기 검증을 구분한다.
- 명시한 Step이 완료되기 전 다음 Step의 코드 수정을 섞지 않는다. 커밋 메시지에 Step 또는 TASK 식별자를 넣는다. 원격 변경이 있으면 먼저 확인하고 안전하게 통합한다.

## 인계 패킷

아래 필드를 모두 채운다. 미완료/미검증/미푸시 상태를 생략하지 않는다. 커밋 해시는 실제 확인한 값만 쓴다. 문서 안의 해시는 작성 직전 확인한 원격 기준이며, 문서 자신을 포함한 커밋은 자기참조할 수 없으므로 응답 패킷과 `git log -1`에서 최종 푸시 해시를 확인한다.

```markdown
### [GEMINI_HANDOFF_PACKET]
- **Repository & Branch**: Recon987/AI-Coding (main)
- **Latest Pushed Commit**: 확인한 해시 - 커밋 메시지
- **Completed Steps & Modified Files**: 완료 Step, 파일과 핵심 함수
- **Changed Interfaces / Schema Diff**: 변경 시그니처·자료 호환성
- **Test Status**: npm test / npm run test:desktop 실제 결과
- **Remaining Work for Gemini**: 미완료 작업과 재개 위치
- **Modified Code Snippets (if uncommitted)**: 없음 또는 미푸시 변경·경로·핵심 diff
```
