# Codex 작업 기록 — 모듈 플랫폼·AX Desk 명세 준비

사용자 첨부 TASK-v0.3-ARCH-MODULAR-01을 원문 그대로 보관했다(SHA256 일치). 최신main1474d76과Claude f10b1bc·기존 독립 검토PR #11을 확인했다. BK-01/P1·HL-01/P2가 미해결이고 후속6카드는 아직main에 없으므로, 사용자가 지정한 '기존 검증·main 병합 완료 후' 조건에 따라 구현을 시작하지 않았다.

main에서문서 브랜치task/task-arch-modular-01을 만들고 d50808c로 원문·blocked카드를 먼저 푸시했다. 모듈 관리·AX Desk의 기능 목표를 유지하되 실제앱0.8.0·version3·events/notes/calls 계약에 맞춰 보정했다. 고정5탭이라는 전제·schemaVersion필드·v2백업 일괄 적용은 현재코드와 달라 수정했다. 기존통제/사무소/바로가기 접근, 자료/알림 보존, 정적내장레지스트리, 단계별 회귀·Windows 수용조건을 구체화했다. 앱0.8.0을0.3으로 내리는 변경은 하지 않았다.

현재 기준선의 npm test91/91·test:desktop10진입점(타입/빌드 포함)·보드·공백검사가 통과했다. AX 기능은 구현하지 않았고 새기능 검사를 통과했다고 표현하지 않았다. 제품코드·의존성·기존문서는 변경하지 않고 새명세·카드·전용인계·작업기록만 추가했다. [보정명세](../specs/modular-ax/implementation.md), [인계](../specs/modular-ax/handoff.md).

다음구현은 BK-01·HL-01 보완과main 병합이 끝난시점의 최신main에서 feat/modular-architecture를 만들고 Step A/B/C를 작은task카드로 분해해 진행한다. 추가worktree나main 직접커밋·배포는 하지 않았다.
