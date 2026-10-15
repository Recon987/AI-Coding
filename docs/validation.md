# v0.2 검증 결과 — 2026-10-15 (한국 시간)

검증한 소스 커밋: `93faf101181ff52698d1f69add71b21a1e58bd90`.

[Windows 빌드 실행](https://github.com/Recon987/AI-Coding/actions/runs/38701817780)

## 통과

- Linux 클라우드: Node.js 24, 데이터 테스트 9개, TypeScript/프로덕션 빌드, 실제 Electron 업무 시나리오.
- GitHub Windows 러너: 잠금 의존성 설치, 데이터 테스트 9개, 소스 실행 Electron 업무 시나리오.
- Windows 패키징: `공원 업무 수첩 Setup 0.2.0.exe`와 `공원 업무 수첩 0.2.0.exe` 생성.
- 패키징 후 `win-unpacked/공원 업무 수첩.exe`에서 동일한 업무 시나리오 실행. 번들된 화면·preload·공유 데이터 모듈을 실제로 로드하고 저장·재실행 확인.
- SHA256SUMS 생성, [Artifacts 다운로드](https://github.com/Recon987/AI-Coding/actions/runs/38701817780/artifacts/11955804897) 업로드 완료. 로그인 필요, 보관 14일.

업무 시나리오: 메모/전화 등록, 순찰→인계 연결과 중복 방지, 제출 기한과 달력 원본 연계, 통합 검색, 완료 일시, 백업·복원, 잘못된 순찰 참조의 복원 거부, 브리핑 TXT, 프로세스 종료/재실행 보존, 폴더 등록. 파일 선택/확인 대화상자만 테스트에서 대체했다.

## 별도 확인 필요

NSIS 설치 마법사 및 portable 바깥 실행기의 실기기 실행, Windows 10, 기관 보안 프로그램, 실제 OS 알림 표시·집중 지원, 탐색기 실행, 높은 DPI와 다중 모니터. 자동 검증은 기관 배포 승인을 뜻하지 않는다. 코드 서명 및 저장 암호화는 미구현이다.

첫 Windows 실행은 electron-builder의 자동 게시 동작 때문에 빌드 마지막에 실패했다. `--publish never`를 명시하고 NSIS/portable 대상을 모두 지정한 뒤 위 실행에서 통과했다. 이후 코드는 변경하지 않았으며 이 문서는 결과만 추가한다.
