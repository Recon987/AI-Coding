import { useState } from "react";
import { briefing, dayKey, formatCoordinates } from "../../shared/model.mjs";
import type { Data, Page } from "../types";
import { Empty, formatTime, SectionHead, Tag } from "../ui";
export function Briefing({
  data,
  navigate,
  busy,
}: {
  data: Data;
  navigate: (page: Page, id?: string) => void;
  busy: boolean;
}) {
  const [date, setDate] = useState(dayKey());
  const [message, setMessage] = useState("");
  const [showText, setShowText] = useState(false);
  const tasks = data.tasks
    .filter((t) => !t.done)
    .sort(
      (a, b) =>
        Number(b.priority === "high") - Number(a.priority === "high") ||
        Date.parse(a.at) - Date.parse(b.at),
    );
  const overdue = tasks.filter((t) => Date.parse(t.at) < Date.now());
  const patrols = data.patrols
    .filter((p) => dayKey(new Date(p.at)) === date)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const events = data.events
    .filter((e) => dayKey(new Date(e.at)) === date)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  return (
    <>
      <section className="briefing-banner">
        <div>
          <p className="eyebrow">FROM FIELD TO OFFICE</p>
          <h2>
            현장의 기록을
            <br />
            다음 업무로 잇습니다.
          </h2>
          <p>순찰에서 확인한 일, 넘겨야 할 일, 놓치지 말아야 할 기한.</p>
          <div className="banner-actions">
            <button className="primary" onClick={() => navigate("patrol")}>
              순찰 기록 남기기 <span aria-hidden="true">↗</span>
            </button>
            <button onClick={() => navigate("handover")}>인수인계 등록</button>
          </div>
        </div>
        <div className="banner-emblem" aria-hidden="true">
          <span>FIELD</span>
          <div className="mountain-lines">⌁</div>
          <span>RECORD / CONNECT / FOLLOW UP</span>
        </div>
      </section>
      <div className="metrics">
        {[
          {
            label: "기한 지난 업무",
            count: overdue.length,
            page: "handover",
            tone: "warn",
          },
          {
            label: "진행 중 인수인계",
            count: tasks.filter((t) => t.kind === "handover").length,
            page: "handover",
          },
          {
            label: "남은 제출 업무",
            count: tasks.filter((t) => t.kind === "submission").length,
            page: "submission",
          },
          {
            label: "미처리 전화",
            count: data.calls.filter((c) => !c.done).length,
            page: "calls",
          },
        ].map((m, i) => (
          <button
            className={`metric ${m.tone || ""}`}
            key={m.label}
            onClick={() =>
              navigate(
                (i === 0 && overdue[0] ? overdue[0].kind : m.page) as Page,
                i === 0 ? overdue[0]?.id : undefined,
              )
            }
          >
            <span>{m.label}</span>
            <strong>
              {m.count}
              <small>건</small>
            </strong>
            <span className="metric-index">0{i + 1}</span>
          </button>
        ))}
      </div>
      <div className="briefing-columns">
        <section className="panel">
          <SectionHead eyebrow="FOLLOW UP" title="지금 챙겨야 할 일">
            <Tag>{tasks.length}건 진행 중</Tag>
          </SectionHead>
          {!tasks.length && (
            <Empty>
              미완료 업무가 없습니다. 제출 기한이나 인수인계를 등록하면 여기에
              모입니다.
            </Empty>
          )}
          {tasks.slice(0, 6).map((t) => (
            <button
              className="work-line"
              key={t.id}
              onClick={() => navigate(t.kind, t.id)}
            >
              <div
                className={`work-marker ${t.priority === "high" ? "amber" : ""}`}
              />
              <div>
                <span className="work-kind">
                  {t.kind === "submission" ? "제출" : "인수인계"} ·{" "}
                  {t.assignee || "담당 미지정"}
                </span>
                <strong>{t.title}</strong>
                <small>{formatTime(t.at)} 마감</small>
              </div>
              <Tag tone={Date.parse(t.at) < Date.now() ? "red" : ""}>
                {Date.parse(t.at) < Date.now()
                  ? "기한 경과"
                  : t.priority === "high"
                    ? "우선 처리"
                    : "진행 중"}
              </Tag>
            </button>
          ))}
        </section>
        <section className="panel">
          <SectionHead eyebrow="DAILY BRIEFING" title="하루의 기록">
            <input
              className="date-picker"
              aria-label="브리핑 날짜"
              type="date"
              required
              value={date}
              onChange={(e) => {
                if (e.target.value) setDate(e.target.value);
              }}
            />
          </SectionHead>
          <div className="day-counts">
            <span>
              순찰 <b>{patrols.length}</b>
            </span>
            <span>
              일정 <b>{events.length}</b>
            </span>
          </div>
          {[
            ...patrols.map((p) => ({
              id: p.id,
              title: p.title,
              at: p.at,
              label: p.route,
              coordinates: p.coordinates
                ? `${formatCoordinates(p.coordinates)} | ${formatCoordinates(p.coordinates, "dms")}`
                : "",
              page: "patrol",
            })),
            ...events.map((e) => ({
              id: e.id,
              title: e.title,
              at: e.at,
              coordinates: "",
              label: e.done ? "완료 일정" : "예정 일정",
              page: "calendar",
            })),
          ]
            .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
            .slice(0, 5)
            .map((row) => (
              <button
                className="timeline-row"
                key={row.page + row.id}
                onClick={() => navigate(row.page as Page, row.id)}
              >
                <time>
                  {new Date(row.at).toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}
                </time>
                <div>
                  <strong>{row.title}</strong>
                  <small>{row.label}</small>
                  {row.coordinates && (
                    <small className="coordinate-summary">
                      {row.coordinates}
                    </small>
                  )}
                </div>
              </button>
            ))}
          {!patrols.length && !events.length && (
            <p className="muted empty-inline">
              이 날짜에 등록된 순찰과 일정이 없습니다.
            </p>
          )}
          <div className="report-actions">
            <button onClick={() => setShowText(!showText)}>
              {showText ? "브리핑 닫기" : "브리핑 미리보기"}
            </button>
            <button
              disabled={!window.workdesk || busy}
              onClick={async () => {
                try {
                  if (await window.workdesk?.exportBriefing(date))
                    setMessage("브리핑을 텍스트 파일로 저장했습니다.");
                } catch {
                  setMessage(
                    "브리핑을 저장하지 못했습니다. 파일 권한을 확인하세요.",
                  );
                }
              }}
            >
              텍스트로 내보내기
            </button>
          </div>
          {message && (
            <p role="status" className="help">
              {message}
            </p>
          )}
        </section>
      </div>
      {showText && (
        <section className="panel report-preview">
          <h2>업무 브리핑 미리보기</h2>
          <pre>{briefing(data, date)}</pre>
        </section>
      )}
      <section className="next-step">
        <div>
          <p className="eyebrow">ONE CONNECTED WORKFLOW</p>
          <h2>기록 한 번으로, 다음 담당자까지.</h2>
          <p>
            순찰 일지에서 ‘인수인계로 연결’을 누르면 확인 사항과 현장 조치가
            이어집니다.
            <br />
            연결된 업무의 마감은 월간 일정에 함께 표시됩니다.
          </p>
        </div>
        <div className="flow">
          <span>
            01
            <br />
            <b>순찰 기록</b>
          </span>
          <i>→</i>
          <span>
            02
            <br />
            <b>인수인계</b>
          </span>
          <i>→</i>
          <span>
            03
            <br />
            <b>조치 완료</b>
          </span>
        </div>
      </section>
    </>
  );
}
