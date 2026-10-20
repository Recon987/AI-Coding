# B1 게시본과 Claude 업무 허브 스키마 교차 검증

## 판정

**일반 작업을 별도 `workItems`에 저장하는 방향은 일치하지만, 명세를 그대로 구현하면 B1과 호환되지 않는 부분이 있어 수정이 필요하다.** 아래는 문서·후속 구현 계약에 대한 보완 요청이며 B1 자체 검증의 실패 판정이 아니다. B1 제품 코드는 이번 검토에서 바꾸지 않았다. Claude의 B1 독립 승인도 아직 없다.

- B1: 구현 `77de23d`, 게시 상태 문서까지 포함한 원격 `322f56c880b655478286f6320b8082f2820fa7fd`.
- 지정 문서: [Claude `1ac80a3` 스키마 계획](https://github.com/Recon987/AI-Coding/blob/1ac80a3/docs/product/claude-hub-schema-plan-2026-10-20.md), [TASK-HUB-SCHEMA-01](https://github.com/Recon987/AI-Coding/blob/1ac80a3/docs/tasks/TASK-HUB-SCHEMA-01.md).
- 추가 확인: 원격 최신 `9f4fe7c`의 확정 6장과 B2a 카드. `workItems` 선택은 확정됐으나 `source.kind`·회의 범위 가정은 여전히 B1과 다르다. 이 문서가 작성된 시점에는 B1을 보지 못했다는 사실을 고려한다.
- B1 [자료 타입](https://github.com/Recon987/AI-Coding/blob/322f56c/src/types.ts#L23), [검증·파생 로직](https://github.com/Recon987/AI-Coding/blob/322f56c/shared/work.mjs#L15), [작업 저장 UI](https://github.com/Recon987/AI-Coding/blob/322f56c/src/components/Work.tsx#L69).

## 통합 전 맞출 세 묶음

### SCHEMA-B1-01 / P1 — 출처의 저장 위치와 판별자

문서 1.2는 `workItems.source:{type,id,title}`이고, 최신 6장은 `source:{kind,id,title}`로 바꿨다. B1의 출처 원본은 **`links[].from:{type,id}` → `to:{type:"workItem",id}`**, `role:"followUp"`이다. `workItems.source`를 읽거나 생성하지 않는다.

실측: 작업에 `source`만 넣으면 모르는 필드로 보존되지만 후속 수·출처 복귀에는 반영되지 않는다. `links`는 하나의 출처에서 여러 작업, 한 작업의 복수 출처도 표현할 수 있다. 단일 `source`로 자동 치환하면 복수 관계를 잃을 수 있다.

**정렬 권고**: B2a는 게시된 `links` 관계를 먼저 지원하고 `source`를 두 번째 원본으로 만들지 않는다. 확정 문구가 단일 `source`를 요구한다면, 관계 보존·구판 동작을 포함한 명시적인 전환 계약을 먼저 합의해야 한다. 이번 검토에서 해당 결정을 바꾼 것으로 간주하지 않는다.

삭제된 출처에 제목 사본을 덧붙이는 문서 제안은 B1 수용 기준보다 넓은 기능이다. B1은 `출처: 삭제된 메모/전화메모/회의 기록`과 작업 본문을 보존하며, 원본 제목 사본은 저장하지 않는다. 필요하면 관계의 선택 표시 메타데이터로 별도 설계하고 기존 링크를 그대로 읽어야 한다. `kind`와 `type`을 암묵적으로 같은 필드로 취급하지 않는다.

### SCHEMA-B1-02 / P1 — 일시 기한과 명시 알림 계약

문서 `Due.kind:"at"`는 B1의 `"datetime"`과 다르다. 실제 B1 모델에 `{kind:"at",at:ISO}`를 넣으면 **"작업 기한을 확인하세요."**로 거부된다.

또한 B1 `WorkItem`에는 문서 표에서 빠진 **`remindMinutes:number|null`이 필수**다. 기본은 `null`(알림 없음)이고 일시 기한에만 0/60/1440을 직접 선택할 수 있다. 해당 필드를 빼면 **"시각 알림은 일시 기한에서만 명시적으로 설정하세요."**로 거부된다. 빠진 필드를 0으로 추정하면 원치 않는 알림을 만들 수 있다.

**정렬 권고**: 생산자·검증자·롤업은 `null | {kind:"date",date} | {kind:"datetime",at}`와 `remindMinutes:null` 기본을 사용한다. 날짜만 기한에 임의 시각이나 알림을 만들지 않는 원칙은 양쪽이 일치한다.

### SCHEMA-B1-03 / P1 — 이미 저장되는 회의와 유효 자료 한도

문서는 회의가 B1 범위 밖이라고 가정하지만 B1에는 `meetings`·회의 화면·회의 후속 작업이 이미 있다. 기존 행은 다음 형태다.

```ts
{ id, title, body, at, attendees: string, createdAt, updatedAt }
```

문서의 B2 회의 예제에는 `createdAt`·`updatedAt`이 없어 그대로 B1에 쓰면 등록 일시 검사에서 거부된다. 반대로 B2가 `projectIds`·`decisions`·`referenceIds`를 새 필수 필드로 요구하면 정상 B1 회의를 거부한다.

작업 제목도 문서는 200자, B1은 **500자**다. 실제로 500자는 통과하고 501자는 거부된다. B2에서 기존 201~500자 제목을 축소·거부해서는 안 된다.

**정렬 권고**: B1 회의를 출발점으로 두고 새 배열은 없는 기존 행을 빈 값으로 읽는 선택 확장으로 만든다. 기존 일시·참석자 문자열·모르는 필드를 보존하며 제목 한도는 500자를 유지한다. 회의의 여러 사업 연결을 필드와 연결표 중 어디에 둘지는 B2에서 한 가지 원본으로 합의한다.

## 일치하는 원칙과 추가 주의

| 항목 | 검증 결과 |
| --- | --- |
| 일반 작업 저장 | `workItems` 별도 저장, `tasks.kind` 인계/제출 불변. 최신 6장과 일치 |
| 상태 비전파 | 작업 완료가 전화 `done`을 바꾸지 않음. 완료 취소 때 `completedAt:null` |
| 출처 1:N·삭제 | `links` 기반 정상. 삭제된 참조 허용, 작업 본문 보존 |
| 기한 3종 | 의미는 일치. 일시 판별자 문자열과 알림 필드 정렬 필요 |
| 구판·판독 수준 | B1 `reader2` 유지. 보안 `reader3` 봉투 전용과 충돌 없음. 보안 제품 코드는 아직 B1에 미통합 |
| 선택 확장 | 모르는 레코드 필드·새 최상위 컬렉션 보존. B1에서 새로 만든 행에는 B2 필드가 없으므로 기본값을 읽어야 함 |
| 끊긴 사업·근거 | 1ac 문서 표의 존재 검증과 2.3의 끊긴 참조 허용은 모순. 9f4 B2a 카드는 형식 검사·끊긴 참조 비거부로 보정돼 B1과 일치 |
| B2 `projects/references` | B1에서 아직 구현하지 않은 별도 범위. 이름 차이를 B1 런타임 결함으로 판정하지 않음 |

새 최상위 컬렉션과 **이미 아는 컬렉션의 새 열거값**을 구별해야 한다. B1은 `links.from.type`의 note/call/meeting, `role:followUp`을 검증한다. 여기에 순찰 출처나 evidence 역할을 그대로 넣으면 B1이 거부함을 실측했다. B2에서 이를 확장한다면 현재 B1과 보안 reader3가 잘못 읽지 않도록 reader4 등 호환 계획을 적용한다. 새 최상위 `references`를 추가하는 것과 같은 변경으로 취급하지 않는다.

## 실행·증빙

- `node tests/hub-schema-contract-audit.cjs`: **8개 재현 성공**, 종료 0. 감사 성공은 명세 일치 승인이 아니라 위 차이와 B1의 유효 계약이 재현됐다는 뜻이다.
- `node --test tests/work.test.cjs tests/work-timezone.test.cjs tests/schema.test.cjs`: **15/15 통과**, 5개 시간대·DST·구판 판독 포함.
- 이전 전체 B1 자체 검사: 단위175/175, desktop19종+감사3종/9사례. 이번에 전체 Linux 앱 검사를 다시 실행한 결과로 표시하지 않는다.
- JSON: [교차 감사 원결과](hub-schema-crosscheck-2026-10-20.json).

Windows는 게시된 `322f56c`를 대상으로 [실행 39408113609](https://github.com/Recon987/AI-Coding/actions/runs/39408113609)를 수동 시작했고 **완료·success**를 확인했다.

| Windows 단계 | 결과 |
| --- | --- |
| 단위 검사 | 175/175 성공 |
| 소스 앱 desktop 검사 | 성공, B1 새 시나리오 포함 |
| Windows 설치 파일/포터블 빌드 | 성공 |
| 패키징 앱 검사 | 성공, B1 새 시나리오 포함 |
| 체크섬·산출물 업로드 | 성공 |

[실행·작업 단계·산출물 API 증빙](hub-b1-windows-2026-10-20.json). 이번 후속 커밋의 src/shared/desktop/package/Windows workflow는 검사 대상과 같고 문서·수동 감사 도구만 추가한다. 기관 실기기·NVDA·보안 DPAPI 통합 검증과 구별한다.

## Claude 전달용

> B1 원격은 task/task-hub-b1-01, 구현 77de23d / 게시 기록 322f56c다. 1ac80a3와 9f4fe7c를 대조했고 SCHEMA-B1-01~03 보완이 필요하다. 출처의 실제 원본은 links.from.type → to.workItem/role:followUp, 일시 기한은 kind:datetime와 remindMinutes:null 기본이다. meetings는 B1에 이미 있으며 기존 createdAt/updatedAt·attendees 문자열·제목500자를 보존해야 한다. B2 새 필드는 없는 B1 행을 기본값으로 읽고, 순찰 링크 등 알려진 enum 확장에는 reader 호환 계획을 적용해 달라. source.kind 확정과의 차이는 무손실 전환 없이 덮어쓰지 말고 명세에 정렬 결정을 남겨 달라. 이번 결과는 B1에 대한 Claude 독립 승인을 대신하지 않는다.
