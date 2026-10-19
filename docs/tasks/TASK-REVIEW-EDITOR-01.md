---
id: TASK-REVIEW-EDITOR-01
title: EDITOR-01·02 편집창·입력 오류·저장 중 포커스 독립 검증
status: done
role: verifier
owner: codex
verifier: claude
branch: task/task-review-editor-01
depends:
priority: P1
updated: 2026-10-19
---

## 배경
Claude 인계 9e2d719의 EDITOR-01·EDITOR-02를 Node24와 실제 Electron에서 독립 검증한다. 이전 검증 PR #4 내용도 원 브랜치에 포함됐음을 확인했다. 정확한 9e2d719의 Windows39105341497 성공을 조회했다.

## 완료 조건
- [x] 머리 한 줄·크기·단축키·취소/확인창과 확대/작은 화면 동작
- [x] 필수·오류·힌트 연결과 첫 오류 포커스, 저장 중 동작 차단/키보드 위치 유지
- [x] 실패·지연 저장·연속 동작 경계 확인, 필요 보완
- [x] 단위·실제 앱·화면·Windows 증빙과 한국어 기록·푸시

## 범위 밖
새 스키마 정책·암호화·ERP·용어 확정·main 직접 병합.

## 진행 단계
- [x] 1. 최신 원격·카드·Windows 결과 확인과 검증 선점
- [x] 2. 세 분야 독립 검토·기준선 검사
- [x] 3. 발견 재현·보완·재검토
- [x] 4. 최종 검사·인계·커밋/푸시

## 재개 위치
**완료**: 2026-10-19 사용자 승인으로 PR Recon987/AI-Coding#1(claude/zen-cannon-wc1at4)을 main에 병합(merge commit). 이전 메모: 2026-10-18 Claude가 이 브랜치(b90fe5d)를 원 브랜치 claude/zen-cannon-wc1at4에 fast-forward로 통합하고 확인했다(아래). main 병합 시 done. 다음 구현은 TASK-DATES-01.

## 테스트 상태
- 기준9e2d719: Node24 단위89/89·desktop7진입점·UI142·흐름11 통과. Windows39105341497 성공.
- 새 실제 Electron 회귀3개: 수정 전 전부 실패 → 수정 후 전부 통과. 접힌 순찰/단속 좌표, CSV 지연 저장 중 탭 이동·실패·재시도 확인.
- 보완본: npm test89/89·npm run test:desktop8진입점·UI142/오류0/외부요청0·업무흐름11/11 통과.
- 독립 UX16개 배치 조합·빈 필수/MetaEnter 저장 승인, A3 오류/초안 보존 및 A2 지연·실패 저장 재검토 승인.
- 보완 소스 `f97aaf3f62ce9261e3d5e40ee7a4a44d012822a4`의 [Windows39105905136](https://github.com/Recon987/AI-Coding/actions/runs/39105905136) 성공(2분13초): 단위89·소스8진입점·패키징 EXE의 신규3회귀/기존검사·NSIS/portable·SHA256SUMS·업로드. 각 PASS를 로그에서 확인. [검증 빌드](https://github.com/Recon987/AI-Coding/actions/runs/39105905136/artifacts/12128711616). 기존 원본9e2d719 성공과 구분한다.

## 검증 기록
A3 오류 포커스는 접힌 details를 펼치지 않아 이동 실패(P2). A2 사무소 탭은 native disabled를 제거하면서 클릭/키보드 busy 가드가 빠져 CSV 반입 실패 시 입력·미리보기 유실(P1). 각각 helper에서 활성 실제 입력 선택/상위 details 펼침, 탭 aria-disabled/클릭·방향키 가드로 보완했다. 독립 검토자가 재현 경로로 수정 후 재승인했다. 상세 [검토 기록](../reviews/2026-10-18-codex-editor.md).

### Claude 확인 — 2026-10-18

검증자(Claude)가 보완 브랜치를 받아 확인했다. 두 결함 모두 Claude 구현의 실제 누락이다. ① 사무소 탭의 `disabled`를 없애면서 저장 중 동작 무시를 빠뜨려 CSV 반입 초안이 사라질 수 있었다 → aria-disabled와 클릭·방향키 가드 추가가 맞다. ② `focusFirstInvalid`가 접힌 details 안의 오류 칸을 펼치지 않았다 → 상위 details를 펼친 뒤 포커스가 맞다. 코드 변경은 src/ui.tsx·src/components/Office.tsx뿐이며 데이터·IPC는 그대로다. 통합 후 Linux Node 22에서 `npm test` 89/89, 새 `tests/desktop-editor-smoke.cjs` 3개 통과. **승인**.
