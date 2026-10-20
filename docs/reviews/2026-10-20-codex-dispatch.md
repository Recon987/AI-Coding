# TZ-TEST-01·NAV-02·LOCATION-01 독립 검증 — 2026-10-20

검증 기준은 Claude 브랜치 `519b7cc6bb782fd057949d5f1bddb06ca27664cc`, 실행 소스 `82f3a5985130267390cb228c6bac629392147c6d`다. 둘 사이 변경은 handoff·LOCATION 카드의 Windows 증빙 문서뿐이다. 기존 POSTMERGE-01 기록을 보존한 채 검증 브랜치에 merge commit `017dd62`로 통합했다. 제품 구현자는 Claude, 검증자는 Codex다. Codex는 제품 코드를 바꾸지 않았다.

## 판정

| 카드 | 판정 | 현재 상태·다음 작업 |
| --- | --- | --- |
| TASK-TZ-TEST-01 | **승인** | review 유지, 총괄 병합 대기 |
| TASK-NAV-02 | **승인** | review 유지, 총괄 병합 대기 |
| TASK-LOCATION-01 | **반려 — LOC-01/P2** | in-progress로 반려, Claude가 파일 선택 실패 뒤 낡은 미리보기 무효화 보완 |

세 카드 묶음의 전체 병합 승인은 LOCATION-01 보완까지 보류한다. 이미 완료된 POSTMERGE-01의 MOD-01·AX-DATES-01·보고서 승인과 스니펫 일반 기능 승인은 유지한다. 스니펫 Python 예제 SNIP-01/P3는 기존 backlog다. 이번 디스패치는 제품 기능 수정이나 main 병합을 요청하지 않았다.

## LOC-01 / P2 — 거부한 CSV 파일 선택 후 이전 미리보기로 저장 가능

위치: `src/components/ZoneManager.tsx:91` 파일 선택 처리, 특히 catch(98~100행). 정상 파일 읽기는 `update(...)`가 source와 preview를 함께 바꾸지만, 2MB 초과 또는 UTF-8 디코딩 실패는 `setSource("")`·오류 문구만 바꾼다. 이전 `preview`가 남아 `apply()`는 그 자료를 저장한다.

재현(임시 프로필, 가상 자료):
1. `code,name,route,active` CSV의 가상 3-1구역을 반입 미리보기까지 연다. 아직 적용하지 않는다.
2. 다른 CSV 파일을 선택한다. A: 바이트 `FF FE FF`(유효 UTF-8 아님), B: 2MB+1바이트 파일. 두 경로 각각 검사했다.
3. 오류 안내가 나오고 반입 CSV 칸은 비워지지만 이전 미리보기의 **확인 후 반입 적용** 단추가 남는다.
4. 단추를 누르면 거부된 새 파일이 아니라 이전 CSV의 3-1구역이 실제 workdesk.json에 저장된다.

오류 순간 자동 저장되는 것은 아니다. **사용자가 남은 적용 단추를 누를 때 낡은 파일이 적용된다**는 문제다. 다른 기존 구역을 같은 번호로 갱신하는 CSV라면 사용자의 현재 선택과 다른 목록을 저장할 수 있다. 반입 실패 시 원본 보존과 미리보기-현재 입력 일치 계약을 만족하지 못한다.

[독립 실제 앱 결과](dispatch-20261020/nav-zones-audit.json): 두 경로 모두 sourceAfterReject 빈 문자열, applyStillVisible=true, originalUnchangedBeforeApply=true, 적용 후 savedCodes=["3-1"], originalUnchangedAfterApply=false. `node tests/desktop-nav-zones-audit.cjs`는 **3통과·2실패, 종료 1**이다. 필수 검사와 분리해 실패 그대로 보존했다.

보완 조건: 파일 선택이 바뀔 때 기존 미리보기/적용을 즉시 무효화하고, 크기·인코딩·읽기 오류에서 유지하지 않는다. 실패 후 이전 적용이 불가능해야 하며, 새 정상 파일의 재검토·저장 실패 재시도·기존 자료 보존이 유지되어야 한다. 제품 코드는 수정하지 않고 원 카드에 반려했다.

## 승인·대조 근거

**TZ-TEST-01**: tests/schema.test.cjs의 순찰 시각 한 줄에서 +09:00을 제거해 해당 테스트의 지역 날짜 집계와 일치시켰다. minReader2·저장 보호본·집계·TXT/CSV·조치 제거 후 읽기 수준 유지 검증을 줄이지 않았다. 앱 날짜 기준 변경은 없다. 서울·UTC·뉴욕·키리티마티·호놀룰루 전체 npm test가 각각167/167이다.

**NAV-02**: 화면 변경을 도구별 localStorage에 기억하고, 해당 도구 소속 화면인지 검사해 복원한다. 일반 실제 앱 검사에서 도구 재방문·앱 재실행 유지·업무 파일 무저장 통과. 독립 검사에서 깨진 JSON·배열·다른 도구 화면은 첫 화면으로, 유효 tasks:submission은 제출 기한으로 복원됨을 확인했다. Storage 읽기·쓰기 예외를 주입해도 앱 내 화면 기억은 유지되며 업무 파일은 바이트 그대로, 미처리 화면 예외0이다.

**LOCATION-01 정상 경로**: 담당구역 선택 필드 zones는 없는 기존v3를 읽고 구버전에서는 모르는 최상위 항목 보존 경로를 사용한다. 이름·구간·활성 여부·번호 중복·10,000건 검증, 같은 코드 갱신 시 ID 유지, 파일 밖 구역·과거 순찰 번호 보존을 확인했다. 실제 UTF-8 파일(한글·쉼표 포함) 반입, 붙여 넣기 미리보기→확인 적용, 입력 변경 시 미리보기 제거, 실패한 저장 뒤 원본/CSV/미리보기 보존, 미래 자료의 반입·삭제 잠금도 통과했다. 거부한 파일 뒤 낡은 미리보기 문제는 이 정상 경로 검사와 별도다.

## 독립 실행

- Node24.19.0. [검사 요약](dispatch-20261020/summary.json).
- 전체 단위 검사: 시간대5종 각각167/167, 합계835/835. 실패·건너뜀0.
- `npm run test:desktop`: 종료0. 일반18개 진입점+독립 감사3개(DS5·BK2·HL2=9/9) 모두 통과.
- 추가 `tests/desktop-nav-zones-audit.cjs`: NAV설정 경계·정상 파일/저장 실패·읽기전용3통과, LOC-01의UTF-8/크기2실패.
- [업무 과업](dispatch-20261020/flows.json): 11/11 완료. T4제출4클릭·T6a통제6클릭·T7전화3클릭, 기존 측정과 동일. 첫 사용 측정이므로 반복 사용 메뉴 한 번 복원과 구분한다.
- 이번 세 카드 검증에서 일반 UI150개를 다시 실행하지 않았다. 이번에 실행한 desktop 및 추가 경계·과업 결과만 이번 독립 증빙으로 사용한다.

## Windows 대조

[39358186950](https://github.com/Recon987/AI-Coding/actions/runs/39358186950), job118417826288의 API 상태·headSHA·상세 로그를 읽었다. `workflow_dispatch`, head `82f3a5985130267390cb228c6bac629392147c6d`, completed/success다. 519b7cc는 문서 후속이므로 실행 소스와 구분했다.

[API·단계·선택 로그](dispatch-20261020/windows.json): 단위167/167, 소스와 패키지에서 NAV마지막 화면 기억·LOCATION정상 반입 PASS를 각각 확인했다. 빌드·패키지 검사·체크섬·업로드 모두 성공이다. 새 LOC-01 독립 감사는 해당 Windows 빌드에 없으므로 이 성공이 발견을 해소하지 않는다. 기관 Windows실기기·네이티브 트레이·NVDA검증은 미실행이다.

## 원격 보존

사용자의 명시적 승인으로 기존 b3552b9를 먼저 푸시했다. 이후 Claude기준 통합과 검증 체크포인트 bdc8ab7도 origin/task/task-review-postmerge-01에 푸시했다. 이 문서와 최종 결과는 같은 브랜치에 커밋·푸시하며, 최종 해시는 응답 인계 패킷에서 확인한다. main은 병합하지 않는다.
