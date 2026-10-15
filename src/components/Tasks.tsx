import { useState } from "react";
import type { Data, Save, Task } from "../types";
import { Empty, Field, formatTime, localInput, SectionHead, Tag } from "../ui";
type Props = {
  data: Data;
  save: Save;
  busy: boolean;
  kind: Task["kind"];
  initialId?: string;
};
export function Tasks({ data, save, busy, kind, initialId }: Props) {
  const isSubmission = kind === "submission";
  const blank = (): Task => ({
    id: "",
    title: "",
    body: "",
    kind,
    at: new Date().toISOString(),
    assignee: "",
    destination: "",
    priority: "normal",
    remindMinutes: 60,
    patrolId: null,
    done: false,
    completedAt: null,
  });
  const [draft, setDraft] = useState<Task>(
    () => data.tasks.find((t) => t.id === initialId) || blank(),
  );
  const [filter, setFilter] = useState("open");
  const [query, setQuery] = useState("");
  const patch = (values: Partial<Task>) => setDraft({ ...draft, ...values });
  const all = data.tasks.filter((t) => t.kind === kind);
  const rows = all
    .filter(
      (t) =>
        (filter === "all" || (filter === "done" ? t.done : !t.done)) &&
        `${t.title} ${t.body} ${t.assignee} ${t.destination}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort(
      (a, b) =>
        Number(a.done) - Number(b.done) || Date.parse(a.at) - Date.parse(b.at),
    );
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const item = {
      ...draft,
      title: draft.title.trim(),
      id: draft.id || crypto.randomUUID(),
    };
    if (!item.title) return;
    const next = draft.id
      ? data.tasks.map((t) => (t.id === draft.id ? item : t))
      : [...data.tasks, item];
    if (await save({ ...data, tasks: next })) setDraft(blank());
  }
  async function toggle(t: Task) {
    if (
      await save({
        ...data,
        tasks: data.tasks.map((x) =>
          x.id === t.id
            ? {
                ...x,
                done: !x.done,
                completedAt: x.done ? null : new Date().toISOString(),
              }
            : x,
        ),
      })
    ) {
      if (draft.id === t.id) setDraft(blank());
    }
  }
  return (
    <div className="workspace-grid">
      <section className="panel records">
        <SectionHead
          eyebrow={isSubmission ? "DEADLINES" : "HANDOVER"}
          title={isSubmission ? "제출할 서류" : "이어받을 업무"}
        >
          <Tag>{all.filter((t) => !t.done).length}건 남음</Tag>
        </SectionHead>
        <div className="list-tools">
          <div className="segmented">
            {[
              ["open", "진행 중"],
              ["done", "완료"],
              ["all", "전체"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={filter === value ? "selected" : ""}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            aria-label="업무 검색"
            placeholder="제목, 담당자 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {rows.length === 0 && (
          <Empty>
            표시할 업무가 없습니다. 오른쪽에서 첫 기록을 등록하세요.
          </Empty>
        )}
        {rows.map((t) => (
          <article className={`record ${t.done ? "finished" : ""}`} key={t.id}>
            <div className="record-top">
              <Tag tone={t.priority === "high" ? "amber" : ""}>
                {t.priority === "high"
                  ? "우선 처리"
                  : isSubmission
                    ? "제출 업무"
                    : "인수인계"}
              </Tag>
              {!t.done && Date.parse(t.at) < Date.now() && (
                <Tag tone="red">기한 경과</Tag>
              )}
              {t.done && <Tag>완료</Tag>}
            </div>
            <h3>{t.title}</h3>
            <p className="record-body">{t.body || "상세 내용 없음"}</p>
            <div className="metadata">
              <span>담당 · {t.assignee || "미지정"}</span>
              <span>마감 · {formatTime(t.at)}</span>
              {t.destination && <span>제출처 · {t.destination}</span>}
            </div>
            {t.patrolId && (
              <p className="source">
                연결된 순찰 ·{" "}
                {data.patrols.find((p) => p.id === t.patrolId)?.title}
              </p>
            )}
            {t.done && t.completedAt && (
              <p className="source">완료 기록 · {formatTime(t.completedAt)}</p>
            )}
            <div className="record-actions">
              <button
                className="primary small"
                disabled={busy}
                onClick={() => toggle(t)}
              >
                {t.done
                  ? "다시 진행"
                  : isSubmission
                    ? "제출 완료"
                    : "조치 완료"}
              </button>
              <button disabled={busy} onClick={() => setDraft(t)}>
                수정
              </button>
              <button
                className="text-button danger"
                disabled={busy}
                onClick={async () => {
                  if (confirm("이 업무를 삭제할까요?")) {
                    if (
                      await save({
                        ...data,
                        tasks: data.tasks.filter((x) => x.id !== t.id),
                      })
                    ) {
                      if (draft.id === t.id) setDraft(blank());
                    }
                  }
                }}
              >
                삭제
              </button>
            </div>
          </article>
        ))}
      </section>
      <form className="panel editor" onSubmit={submit}>
        <SectionHead
          title={
            draft.id
              ? "업무 수정"
              : isSubmission
                ? "제출 기한 등록"
                : "인수인계 등록"
          }
        />
        <Field label="업무 제목">
          <input
            required
            maxLength={500}
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder={
              isSubmission
                ? "예: 주간 실적 제출"
                : "예: 탐방로 안내판 후속 점검"
            }
          />
        </Field>
        <div className="form-row">
          <Field label="담당자">
            <input
              maxLength={100}
              value={draft.assignee}
              onChange={(e) => patch({ assignee: e.target.value })}
              placeholder="이름 또는 담당 업무"
            />
          </Field>
          <Field label="우선순위">
            <select
              value={draft.priority}
              onChange={(e) =>
                patch({ priority: e.target.value as Task["priority"] })
              }
            >
              <option value="normal">일반</option>
              <option value="high">우선 처리</option>
            </select>
          </Field>
        </div>
        <Field label="마감 일시">
          <input
            type="datetime-local"
            required
            value={localInput(draft.at)}
            onChange={(e) => {
              if (e.target.value)
                patch({ at: new Date(e.target.value).toISOString() });
            }}
          />
        </Field>
        {isSubmission && (
          <Field label="제출처">
            <input
              maxLength={500}
              value={draft.destination}
              onChange={(e) => patch({ destination: e.target.value })}
              placeholder="부서 또는 제출 경로"
            />
          </Field>
        )}
        <Field label="인계·제출 내용">
          <textarea
            rows={5}
            maxLength={20000}
            value={draft.body}
            onChange={(e) => patch({ body: e.target.value })}
            placeholder="진행 상황, 남은 조치, 확인할 사항을 적으세요."
          />
        </Field>
        <Field label="알림 시점">
          <select
            value={draft.remindMinutes}
            onChange={(e) => patch({ remindMinutes: Number(e.target.value) })}
          >
            <option value={0}>마감 시각</option>
            <option value={60}>1시간 전</option>
            <option value={1440}>1일 전</option>
          </select>
        </Field>
        <p className="help">
          앱 실행 중 알림을 표시합니다. 지난 기한은 업무 브리핑에서 확인할 수
          있습니다.
        </p>
        <div className="form-actions">
          <button className="primary" disabled={busy}>
            {draft.id ? "변경 저장" : "업무 등록"}
          </button>
          {draft.id && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setDraft(blank())}
            >
              수정 취소
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
