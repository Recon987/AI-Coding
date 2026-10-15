import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { empty, normalize, formatCoordinates } from "../shared/model.mjs";
import type { Data, Page } from "./types";
import { Briefing } from "./components/Briefing";
import { Patrols } from "./components/Patrols";
import { Tasks } from "./components/Tasks";
import { Calendar } from "./components/Calendar";
import { Personal } from "./components/Personal";
import { Empty, SectionHead, Tag } from "./ui";
import "./style.css";
const sections: {
  label: string;
  pages: { id: Page; label: string; icon: string }[];
}[] = [
  {
    label: "업무 흐름",
    pages: [
      { id: "briefing", label: "업무 브리핑", icon: "◈" },
      { id: "patrol", label: "현장 순찰", icon: "⌁" },
      { id: "handover", label: "인수인계", icon: "⇄" },
      { id: "submission", label: "제출 기한", icon: "▤" },
      { id: "calendar", label: "월간 일정", icon: "▦" },
    ],
  },
  {
    label: "나의 기록",
    pages: [
      { id: "calls", label: "전화메모", icon: "◉" },
      { id: "notes", label: "업무 메모", icon: "✎" },
      { id: "folders", label: "바로가기", icon: "▱" },
      { id: "about", label: "앱 안내", icon: "ⓘ" },
    ],
  },
];
const pageNames = Object.fromEntries(
  sections.flatMap((s) => s.pages.map((p) => [p.id, p.label])),
);
const subtitles: Record<Page, string> = {
  briefing: "순찰에서 사무실까지, 오늘 이어갈 업무를 확인하세요.",
  patrol: "현장의 확인 사항과 조치 내용을 기록하고 다음 업무로 연결합니다.",
  handover: "남은 조치와 담당자, 마감일을 한눈에 확인합니다.",
  submission: "서류 제출 기한을 일정과 함께 관리합니다.",
  calendar: "일정·순찰·인수인계·제출 기한을 하나의 달력에서 확인합니다.",
  calls: "짧게 기록하고, 처리 여부를 남기세요.",
  notes: "업무 중 떠오른 생각과 확인할 내용을 모아둡니다.",
  folders: "자주 사용하는 업무 폴더를 바로 엽니다.",
  about: "현재 제공하는 기능과 다음 개발 방향을 확인하세요.",
};
function App() {
  const [data, setData] = useState<Data>(empty),
    [page, setPage] = useState<Page>("briefing"),
    [focusId, setFocusId] = useState<string>(),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState("");
  const [, setClock] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setClock((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);
  const saving = useRef(false);
  const api = window.workdesk;
  useEffect(() => {
    (async () => {
      try {
        if (api) setData(normalize(await api.load()));
        else {
          const raw = localStorage.getItem("park-workdesk-demo");
          const parsed = raw ? JSON.parse(raw) : empty();
          const next = normalize(parsed);
          if (
            parsed.version === 1 &&
            raw &&
            !localStorage.getItem("park-workdesk-demo-v1-backup")
          )
            localStorage.setItem("park-workdesk-demo-v1-backup", raw);
          setData(next);
        }
        setReady(true);
      } catch {
        setError(
          "저장 데이터를 읽지 못했습니다. 기존 파일을 보관하고 백업을 확인하세요.",
        );
      }
    })();
  }, []);
  const save = useCallback(
    async (next: Data) => {
      if (saving.current) return false;
      saving.current = true;
      setBusy(true);
      try {
        const validated = normalize(next);
        if (api) await api.save(validated);
        else
          localStorage.setItem("park-workdesk-demo", JSON.stringify(validated));
        setData(validated);
        setError("");
        return true;
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "저장에 실패했습니다. 저장 공간과 파일 권한을 확인하세요.",
        );
        return false;
      } finally {
        saving.current = false;
        setBusy(false);
      }
    },
    [api],
  );
  function navigate(next: Page, id?: string) {
    if (saving.current) return;
    setPage(next);
    setFocusId(id);
    setQuery("");
  }
  async function backup(restore = false) {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    try {
      if (restore) {
        const next = await api?.restore();
        if (next) {
          setData(normalize(next));
          setFocusId(undefined);
          setPage("briefing");
        }
      } else await api?.backup();
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "백업 작업에 실패했습니다.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  async function folder() {
    try {
      const path = await api?.chooseFolder();
      if (path && !data.folders.some((f) => f.path === path))
        await save({
          ...data,
          folders: [
            ...data.folders,
            {
              id: crypto.randomUUID(),
              title: path.split(/[\\/]/).filter(Boolean).pop() || path,
              path,
            },
          ],
        });
    } catch {
      setError("폴더를 선택하지 못했습니다.");
    }
  }
  const searchRows = [
    ...data.patrols.map((p) => ({
      id: p.id,
      page: "patrol" as Page,
      title: p.title,
      text: `${p.route} ${p.observer} ${p.findings} ${p.action} ${p.coordinates ? `${formatCoordinates(p.coordinates)} ${formatCoordinates(p.coordinates, "dms")}` : ""}`,
    })),
    ...data.tasks.map((t) => ({
      id: t.id,
      page: t.kind as Page,
      title: t.title,
      text: `${t.body} ${t.assignee} ${t.destination}`,
    })),
    ...data.events.map((e) => ({
      id: e.id,
      page: "calendar" as Page,
      title: e.title,
      text: "",
    })),
    ...data.notes.map((n) => ({
      id: n.id,
      page: "notes" as Page,
      title: n.title,
      text: n.body,
    })),
    ...data.calls.map((c) => ({
      id: c.id,
      page: "calls" as Page,
      title: c.title,
      text: `${c.body} ${c.phone}`,
    })),
  ].filter((r) =>
    `${r.title} ${r.text}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-symbol" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div>
            공원 업무 수첩<small>PARK WORKDESK</small>
          </div>
        </div>
        <div className="workspace-label">
          <span className="status-dot" /> 개인 업무 공간
        </div>
        <nav>
          {sections.map((section) => (
            <div className="nav-section" key={section.label}>
              <p>{section.label}</p>
              {section.pages.map((p) => (
                <button
                  key={p.id}
                  disabled={busy}
                  className={page === p.id ? "active" : ""}
                  aria-current={page === p.id ? "page" : undefined}
                  onClick={() => navigate(p.id)}
                >
                  <span aria-hidden="true">{p.icon}</span>
                  {p.label}
                  {p.id === "handover" &&
                    data.tasks.some(
                      (t) => t.kind === "handover" && !t.done,
                    ) && (
                      <small className="nav-count">
                        {
                          data.tasks.filter(
                            (t) => t.kind === "handover" && !t.done,
                          ).length
                        }
                      </small>
                    )}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="offline-dot" />
          {api ? "내 PC에 저장" : "브라우저 체험 모드"}
          <small>기록이 다음 업무의 시작이 됩니다.</small>
          <span className="version">v0.3 · 현장과 사무를 연결</span>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div className="breadcrumbs">
            나의 업무 공간 <span>/</span> <strong>{pageNames[page]}</strong>
          </div>
          <div className="top-actions">
            <input
              aria-label="기록 통합 검색"
              placeholder="기록 통합 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button disabled={!api || !ready || busy} onClick={() => backup()}>
              백업
            </button>
            <button
              disabled={!api || !ready || busy}
              onClick={() => backup(true)}
            >
              복원
            </button>
          </div>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">PARK WORKSPACE / {page.toUpperCase()}</p>
              <h1>{query.trim() ? "통합 검색" : pageNames[page]}</h1>
              <p>
                {query.trim()
                  ? `“${query.trim()}” 검색 결과 ${searchRows.length}건`
                  : subtitles[page]}
              </p>
            </div>
            <time className="current-date">
              {new Date().toLocaleDateString("ko-KR", {
                month: "long",
                day: "numeric",
                weekday: "long",
              })}
              <span>로컬 기록 기준</span>
            </time>
          </div>
          {!api && (
            <div className="notice">
              화면 체험 중입니다. 브라우저 기록은 데스크톱 앱과 별개이며,
              알림·폴더 열기·파일 내보내기는 데스크톱에서 지원합니다.
            </div>
          )}
          {error && (
            <div role="alert" className="error">
              {error}
            </div>
          )}
          {!ready ? (
            <p>
              {error
                ? "원본 데이터를 보존한 상태에서 시작을 중단했습니다."
                : "업무 기록을 불러오는 중입니다."}
            </p>
          ) : query.trim() ? (
            <section className="panel">
              <SectionHead title="검색 결과" />
              {searchRows.slice(0, 100).map((r) => (
                <button
                  className="search-result"
                  key={r.page + r.id}
                  onClick={() => navigate(r.page, r.id)}
                >
                  <Tag>{pageNames[r.page]}</Tag>
                  <div>
                    <strong>{r.title}</strong>
                    <p>{r.text.slice(0, 140)}</p>
                  </div>
                  <span>↗</span>
                </button>
              ))}
              {!searchRows.length && <Empty>일치하는 기록이 없습니다.</Empty>}
              {searchRows.length > 100 && (
                <p className="help">
                  처음 100건을 표시합니다. 검색어를 구체적으로 입력하세요.
                </p>
              )}
            </section>
          ) : (
            <>
              {page === "briefing" && (
                <Briefing data={data} navigate={navigate} busy={busy} />
              )}
              {page === "patrol" && (
                <Patrols
                  key={page + focusId}
                  data={data}
                  save={save}
                  busy={busy}
                  initialId={focusId}
                  openTask={(id) => navigate("handover", id)}
                />
              )}
              {(page === "handover" || page === "submission") && (
                <Tasks
                  key={page + focusId}
                  data={data}
                  save={save}
                  busy={busy}
                  kind={page}
                  initialId={focusId}
                />
              )}
              {page === "calendar" && (
                <Calendar
                  key={page + focusId}
                  data={data}
                  save={save}
                  busy={busy}
                  navigate={navigate}
                  initialId={focusId}
                />
              )}
              {(page === "notes" || page === "calls") && (
                <Personal
                  key={page + focusId}
                  data={data}
                  save={save}
                  busy={busy}
                  mode={page}
                  initialId={focusId}
                />
              )}
              {page === "folders" && (
                <section className="panel">
                  <SectionHead title="자주 쓰는 업무 폴더">
                    <button
                      className="primary"
                      disabled={!api || busy}
                      onClick={folder}
                    >
                      폴더 선택
                    </button>
                  </SectionHead>
                  {!data.folders.length && (
                    <Empty>
                      업무 폴더를 등록하면 여기서 바로 열 수 있습니다.
                    </Empty>
                  )}
                  <div className="folder-grid">
                    {data.folders.map((f) => (
                      <article key={f.id} className="folder-card">
                        <span className="folder-icon" aria-hidden="true">
                          ▱
                        </span>
                        <h3>{f.title}</h3>
                        <p>{f.path}</p>
                        <div className="record-actions">
                          <button
                            disabled={!api || busy}
                            onClick={() =>
                              api
                                ?.openFolder(f.id)
                                .catch(() =>
                                  setError(
                                    "폴더가 이동되었거나 접근할 수 없습니다.",
                                  ),
                                )
                            }
                          >
                            열기
                          </button>
                          <button
                            disabled={busy}
                            onClick={() =>
                              save({
                                ...data,
                                folders: data.folders.filter(
                                  (x) => x.id !== f.id,
                                ),
                              })
                            }
                          >
                            바로가기 제거
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}
              {page === "about" && (
                <div className="about-grid">
                  <section className="panel">
                    <SectionHead
                      eyebrow="ABOUT THIS WORKSPACE"
                      title="국립공원 업무를 위한 개인 기록 도구"
                    />
                    <p>
                      현장 순찰, 인수인계, 제출 기한과 개인 일정을 연결하는 개발
                      시제품입니다. 기록은 이 PC에 저장되며 사무소 공용 서버나
                      ERP에 전송되지 않습니다.
                    </p>
                    <p>
                      기후노트의 오프라인 사용 방식을 참고해 업무 흐름을
                      설계했습니다. 현재 앱의 화면·코드·아이콘은 별도로
                      구현했습니다.
                    </p>
                    <div className="notice">
                      현재 저장 파일과 백업은 암호화되지 않습니다. 기관 자료
                      보호 기능이 마련되기 전까지 가상 자료로 시험하세요.
                    </div>
                    <p className="help">
                      창을 닫으면 앱이 종료됩니다. 알림은 실행 중에만 표시하며
                      Windows 알림 허용이 필요합니다. 이 앱은 공식
                      결재·근태·비상 대응 시스템이 아닙니다.
                    </p>
                  </section>
                  <section className="panel">
                    <SectionHead title="다음 개발 단계" />
                    {[
                      [
                        "법령 자료실",
                        "인터넷 구간 수집 → 검증된 묶음 반입 → 폐쇄망 검색. 자료 기준일과 시행일을 구분합니다.",
                      ],
                      [
                        "거점표·당직표",
                        "기관의 실제 편성 기준과 근무 구간을 확인한 뒤 일정과 연결합니다.",
                      ],
                      [
                        "서무 장부",
                        "예산·급량비·물품은 기관 서식과 계산 기준에 맞춰 설계합니다.",
                      ],
                      [
                        "공유 현황판·ERP",
                        "조회 권한과 제공 API가 확인되면 읽기 전용 서버를 통해 연동합니다.",
                      ],
                    ].map(([title, body]) => (
                      <article className="roadmap-item" key={title}>
                        <Tag>설계 단계</Tag>
                        <h3>{title}</h3>
                        <p>{body}</p>
                      </article>
                    ))}
                  </section>
                </div>
              )}
            </>
          )}
        </div>
        <footer>
          <span>공원 업무 수첩</span>국립공원 업무를 위한 비공식 개발 시제품
        </footer>
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
