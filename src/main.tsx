import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { empty, normalize, formatCoordinates } from "../shared/model.mjs";
import type { Data, Page } from "./types";
import { Briefing } from "./components/Briefing";
import { Patrols } from "./components/Patrols";
import { Tasks } from "./components/Tasks";
import { Calendar } from "./components/Calendar";
import { Personal } from "./components/Personal";
import { Icon } from "./components/Icon";
import { Empty, SectionHead, Tag } from "./ui";
import "./style.css";
const sections: {
  label: string;
  pages: { id: Page; label: string }[];
}[] = [
  {
    label: "업무 흐름",
    pages: [
      { id: "briefing", label: "업무 브리핑" },
      { id: "patrol", label: "현장 순찰" },
      { id: "handover", label: "인수인계" },
      { id: "submission", label: "제출 기한" },
      { id: "calendar", label: "월간 일정" },
    ],
  },
  {
    label: "나의 기록",
    pages: [
      { id: "calls", label: "전화메모" },
      { id: "notes", label: "업무 메모" },
      { id: "folders", label: "바로가기" },
      { id: "about", label: "앱 안내" },
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
  about: "저장 위치, 알림과 백업 사용 방법을 확인하세요.",
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
  const searchInput = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState("");
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(""), 4500);
    return () => clearTimeout(timer);
  }, [feedback]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const editing = target.matches(
        "input, textarea, select, [contenteditable=true]",
      );
      if (
        ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") ||
        (event.key === "/" && !editing)
      ) {
        event.preventDefault();
        searchInput.current?.focus();
        searchInput.current?.select();
      }
      if (event.key === "Escape" && target === searchInput.current) {
        setQuery("");
        searchInput.current?.blur();
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
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
        setFeedback("변경 사항을 저장했습니다.");
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
    window.scrollTo({ top: 0 });
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
          setFeedback("백업 자료를 복원했습니다.");
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
                  aria-label={p.label}
                >
                  <Icon name={p.id} />
                  {p.label}
                  {(() => {
                    const count =
                      p.id === "calls"
                        ? data.calls.filter((c) => !c.done).length
                        : ["handover", "submission"].includes(p.id)
                          ? data.tasks.filter((t) => t.kind === p.id && !t.done)
                              .length
                          : 0;
                    return count ? (
                      <small className="nav-count" aria-hidden="true">
                        {count}
                      </small>
                    ) : null;
                  })()}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="offline-dot" />
          {api ? "내 PC에 저장" : "브라우저 체험 모드"}
          <small>오프라인 개인 업무 공간</small>
          <span className="version">v0.3.1</span>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div className="breadcrumbs">
            나의 업무 공간 <span>/</span> <strong>{pageNames[page]}</strong>
          </div>
          <div className="top-actions">
            <span className="save-indicator" role="status">
              {busy ? (
                <>
                  <Icon name="clock" size={14} />
                  저장 중
                </>
              ) : ready ? (
                <>
                  <Icon name="check" size={14} />내 PC 저장
                </>
              ) : (
                "불러오는 중"
              )}
            </span>
            <div className="global-search">
              <Icon name="search" size={16} />
              <input
                ref={searchInput}
                aria-label="기록 통합 검색"
                placeholder="기록 통합 검색"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <kbd>Ctrl K</kbd>
            </div>
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
          {feedback && (
            <div className="save-feedback" role="status">
              <Icon name="check" size={16} />
              {feedback}
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
                        <span className="folder-icon">
                          <Icon name="folders" size={32} />
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
                      현장 순찰, 인수인계, 제출 기한과 개인 일정을 함께
                      관리합니다. 기록은 이 PC에 저장되며 사무소 공용 서버나
                      ERP에 전송되지 않습니다.
                    </p>

                    <div className="notice">
                      저장 파일과 백업은 평문입니다. 민감한 자료는 기관의 보관
                      정책을 확인하세요.
                    </div>
                    <p className="help">
                      창을 닫으면 앱이 종료됩니다. 알림은 실행 중에만 표시하며
                      Windows 알림 허용이 필요합니다. 이 앱은 공식
                      결재·근태·비상 대응 시스템이 아닙니다.
                    </p>
                  </section>
                  <section className="panel">
                    <SectionHead title="저장과 백업" />
                    <h3>이 PC에 보관됩니다</h3>
                    <p>
                      Windows 저장 위치는 %APPDATA%/park-workdesk/workdesk.json
                      입니다. PC를 옮길 때는 상단의 백업으로 파일을 만든 뒤 새
                      PC에서 복원하세요.
                    </p>
                    <h3>복원 전에도 자료를 보관합니다</h3>
                    <p>
                      복원은 현재 기록을 교체합니다. 교체 전 자료는 같은 저장
                      폴더에 자동 보관합니다.
                    </p>
                    <h3>검색 바로가기</h3>
                    <p>
                      Ctrl+K 또는 / 키로 통합 검색을 엽니다. 검색창에서 Esc를
                      누르면 원래 화면으로 돌아갑니다.
                    </p>
                  </section>
                </div>
              )}
            </>
          )}
        </div>
        <footer>
          <span>공원 업무 수첩</span>오프라인 개인 업무 공간
        </footer>
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
