import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createRoot } from "react-dom/client";
import {
  empty,
  normalize,
  activeControls,
  dayKey,
} from "../shared/model.mjs";
import type { Data, Page } from "./types";
import { formatDate } from "../shared/format.mjs";
import { searchRecords } from "../shared/search.mjs";
import { hasDirtyDrafts, subscribeDirty } from "./drafts";
import { DesktopSettings } from "./components/DesktopSettings";
import { Office } from "./components/Office";
import { Briefing } from "./components/Briefing";
import { Patrols } from "./components/Patrols";
import { Controls } from "./components/Controls";
import { Tasks } from "./components/Tasks";
import { Calendar } from "./components/Calendar";
import { Personal } from "./components/Personal";
import { Icon } from "./components/Icon";
import { Empty, SectionHead, Tag } from "./ui";
import "./style.css";
import { ConfirmHost, discardChanges, isConfirmOpen } from "./confirm";
// Five task groups plus help pinned at the bottom (TASK-NAV-01).
const sections: {
  label: string;
  pages: { id: Page; label: string }[];
  footer?: boolean;
}[] = [
  {
    label: "오늘",
    pages: [
      { id: "briefing", label: "업무 브리핑" },
      { id: "calendar", label: "월간 일정" },
    ],
  },
  {
    label: "현장",
    pages: [
      { id: "patrol", label: "현장 순찰" },
      { id: "controls", label: "탐방로 통제" },
    ],
  },
  {
    label: "할 일",
    pages: [
      { id: "handover", label: "인수인계" },
      { id: "submission", label: "제출 기한" },
    ],
  },
  { label: "사무소", pages: [{ id: "office", label: "사무소 현황" }] },
  {
    label: "기록",
    pages: [
      { id: "calls", label: "전화메모" },
      { id: "notes", label: "업무 메모" },
      { id: "folders", label: "바로가기" },
    ],
  },
  { label: "", footer: true, pages: [{ id: "about", label: "앱 안내" }] },
];
const pageNames = Object.fromEntries(
  sections.flatMap((s) => s.pages.map((p) => [p.id, p.label])),
);
const subtitles: Record<Page, string> = {
  office: "직원별 근무·휴무·당직·거점 배치를 일별·주간으로 확인합니다.",
  briefing: "순찰에서 사무실까지, 오늘 이어갈 업무를 확인하세요.",
  patrol: "현장의 확인 사항과 조치 내용을 기록하고 다음 업무로 연결합니다.",
  controls: "산불·기상특보·공사 등으로 통제 중인 구간과 기간을 기록합니다.",
  handover: "남은 조치와 담당자, 마감일을 한눈에 확인합니다.",
  submission: "서류 제출 기한을 일정과 함께 관리합니다.",
  calendar: "일정·순찰·인수인계·제출 기한과 공휴일·반복 일정을 확인합니다.",
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
  const searchDialog = useRef<HTMLDialogElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const dirty = useSyncExternalStore(
    subscribeDirty,
    hasDirtyDrafts,
    () => false,
  );
  useEffect(() => {
    const dialog = searchDialog.current;
    if (searchOpen) {
      if (dialog && !dialog.open) dialog.showModal();
      searchInput.current?.focus();
    } else {
      dialog?.close();
      setQuery("");
    }
  }, [searchOpen]);
  // A sequence number makes a repeated message ("변경 사항을 저장했습니다." twice) a new
  // announcement and restarts the timer (TASK-A11Y-02, found in Codex review).
  const [feedback, setFeedbackState] = useState({ message: "", sequence: 0 });
  const [feedbackFocused, setFeedbackFocused] = useState(false);
  const feedbackReturn = useRef<HTMLElement | null>(null);
  const setFeedback = useCallback(
    (message: string) =>
      setFeedbackState((previous) => ({ message, sequence: previous.sequence + 1 })),
    [],
  );
  const dismissFeedback = useCallback(() => {
    const target = feedbackReturn.current;
    feedbackReturn.current = null;
    setFeedbackFocused(false);
    setFeedbackState((previous) => ({ ...previous, message: "" }));
    // Closing from the keyboard returns focus to where the user was working.
    if (target?.isConnected) target.focus();
  }, []);
  useEffect(() => {
    // Long enough to read at 125% zoom; paused while the close button has focus.
    if (!feedback.message || feedbackFocused) return;
    // Clear only the message this timer was started for: an older timer that fires in
    // the gap before React cancels it must not erase a newer message (seen on Windows).
    const sequence = feedback.sequence;
    const timer = setTimeout(
      () =>
        setFeedbackState((previous) =>
          previous.sequence === sequence ? { ...previous, message: "" } : previous,
        ),
      8000,
    );
    return () => clearTimeout(timer);
  }, [feedback, feedbackFocused]);
  useEffect(() => {
    // Ctrl/Cmd+K only: a bare "/" fired by dictation or a screen reader's browse mode
    // opened search mid-task and could not be switched off (WCAG 2.1.4, TASK-A11Y-02).
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        searchInput.current?.focus();
        searchInput.current?.select();
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
        if (api) {
          setData(normalize(await api.load()));
          const notice = await api.takeNotice();
          if (notice) setError(notice);
        }
        else {
          const raw = localStorage.getItem("park-workdesk-demo");
          const parsed = raw ? JSON.parse(raw) : empty();
          const next = normalize(parsed);
          if ([1, 2].includes(parsed.version) && raw) {
            const backupKey = `park-workdesk-demo-v${parsed.version}-backup`;
            if (!localStorage.getItem(backupKey))
              localStorage.setItem(backupKey, raw);
          }
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
        const saved = api ? await api.save(validated) : undefined;
        if (!api)
          localStorage.setItem("park-workdesk-demo", JSON.stringify(validated));
        setData(validated);
        setError(saved ? saved.warning : "");
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
  async function navigate(next: Page, id?: string) {
    if (saving.current || isConfirmOpen()) return;
    if (hasDirtyDrafts() && !(await discardChanges("이동할까요?"))) return;
    setSearchOpen(false);
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
        setError((await api?.takeNotice()) ?? "");
      } else {
        await api?.backup();
        setError("");
      }
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
  const searchRows = searchRecords(data, query);
  return (
    <div className="app">
      <ConfirmHost />
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
        <nav>
          {sections.map((section) => (
            <div
              className={`nav-section ${section.footer ? "nav-footer" : ""}`}
              key={section.label || "footer"}
            >
              {section.label && <p>{section.label}</p>}
              {section.pages.map((p) => (
                <button
                  key={p.id}
                  aria-disabled={busy || undefined}
                  className={page === p.id ? "active" : ""}
                  aria-current={page === p.id ? "page" : undefined}
                  onClick={() => navigate(p.id)}
                  aria-label={p.label}
                >
                  <Icon name={p.id} />
                  {p.label}
                  {(() => {
                    const count =
                      p.id === "controls"
                        ? activeControls(data, dayKey()).length
                        : p.id === "calls"
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
          <span className="version">공원 업무 수첩 · v0.8.0</span>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <span className="workspace-title">업무 공간</span>
          <div className="top-actions">
            <span
              className={`save-indicator ${dirty ? "unsaved" : ""}`}
              role="status"
              data-state={
                busy ? "busy" : dirty ? "unsaved" : ready ? "ready" : "loading"
              }
            >
              <Icon
                name={busy ? "clock" : dirty ? "notes" : "check"}
                size={14}
              />
              {busy
                ? "처리 중"
                : dirty
                  ? "저장되지 않은 변경"
                  : ready
                    ? "이 PC에 저장"
                    : "불러오는 중"}
            </span>
            <button
              className="global-search"
              disabled={!ready}
              aria-label="통합 검색 열기"
              aria-keyshortcuts="Control+K"
              onClick={() => setSearchOpen(true)}
            >
              <Icon name="search" size={17} />
              <span>기록 검색</span>
              <kbd>Ctrl K</kbd>
            </button>
            <details className="data-menu">
              <summary>자료 관리</summary>
              <div>
                <button
                  disabled={!api || !ready || busy}
                  onClick={(event) => {
                    event.currentTarget
                      .closest("details")
                      ?.removeAttribute("open");
                    backup();
                  }}
                >
                  <Icon name="download" size={16} />
                  백업
                </button>
                <button
                  disabled={!api || !ready || busy}
                  onClick={(event) => {
                    event.currentTarget
                      .closest("details")
                      ?.removeAttribute("open");
                    backup(true);
                  }}
                >
                  <Icon name="handover" size={16} />
                  복원
                </button>
              </div>
            </details>
          </div>
        </header>
        <div className={`content page-${page}`}>
          <div className="page-heading">
            <div>
              <h1>{pageNames[page]}</h1>
              <p>{subtitles[page]}</p>
            </div>
            <time className="current-date">
{formatDate(new Date())}
            </time>
          </div>
          {!api && (
            <div className="notice">
              화면 체험 중입니다. 브라우저 기록은 데스크톱 앱과 별개이며,
              알림·폴더 열기·파일 내보내기는 데스크톱에서 지원합니다.
            </div>
          )}
          {/* Always-present live region: screen readers miss regions inserted with their text. */}
          <div className="sr-only" role="status" aria-atomic="true">
            {feedback.message && (
              <span key={feedback.sequence} data-sequence={feedback.sequence}>
                {feedback.message}
              </span>
            )}
          </div>
          {feedback.message && (
            <div
              className="save-feedback"
              onFocus={(event) => {
                setFeedbackFocused(true);
                if (!event.currentTarget.contains(event.relatedTarget))
                  feedbackReturn.current = event.relatedTarget instanceof HTMLElement
                    ? event.relatedTarget
                    : null;
              }}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget))
                  setFeedbackFocused(false);
              }}
            >
              <Icon name="check" size={16} />
              {/* Already read out by the status region above. */}
              <span aria-hidden="true">{feedback.message}</span>
              <button
                type="button"
                className="save-feedback-close"
                aria-label="알림 닫기"
                title="알림 닫기"
                onClick={dismissFeedback}
              >
                ×
              </button>
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
          ) : (
            <>
              {page === "office" && (
                <Office data={data} save={save} busy={busy} />
              )}
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
              {page === "controls" && (
                <Controls
                  key={page + focusId}
                  data={data}
                  save={save}
                  busy={busy}
                  initialId={focusId}
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
                  <DesktopSettings />
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
                      알림과 창 닫기 동작은 트레이 설정에서 변경할 수
                      있습니다.
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
                      Ctrl+K로 통합 검색을 엽니다. 검색창에서 Esc를
                      누르면 원래 화면으로 돌아갑니다.
                    </p>
                  </section>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <dialog
        ref={searchDialog}
        className="search-dialog"
        aria-label="통합 검색 창"
        onCancel={(event) => {
          event.preventDefault();
          setSearchOpen(false);
        }}
      >
        <div className="search-dialog-header">
          <Icon name="search" size={20} />
          <input
            ref={searchInput}
            aria-label="기록 통합 검색"
            placeholder="제목, 구간, 담당자, 전화번호로 검색"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button
            type="button"
            aria-label="통합 검색 닫기"
            onClick={() => setSearchOpen(false)}
          >
            닫기 <kbd>Esc</kbd>
          </button>
        </div>
        <div className="search-results">
          <p className="search-count" role="status" aria-atomic="true">
            {query.trim() ? `검색 결과 ${searchRows.length}건` : ""}
          </p>
          {query.trim() ? (
            <>
              {searchRows.slice(0, 100).map((row) => (
                <button
                  className="search-result"
                  key={row.page + row.id}
                  onClick={() => navigate(row.page, row.id)}
                >
                  <Icon name={row.page} />
                  <div>
                    <strong>{row.title}</strong>
                    <p>{row.text.slice(0, 140)}</p>
                  </div>
                  <Tag>{pageNames[row.page]}</Tag>
                </button>
              ))}
              {!searchRows.length && (
                <Empty>
                  일치하는 기록이 없습니다. 다른 제목이나 담당자로 검색하세요.
                </Empty>
              )}
              {searchRows.length > 100 && (
                <p className="help">
                  처음 100건을 표시합니다. 검색어를 구체적으로 입력하세요.
                </p>
              )}
            </>
          ) : (
            <div className="search-hint">
              <Icon name="search" size={28} />
              <h2>어떤 기록을 찾으세요?</h2>
              <p>
                순찰·인수인계·일정·전화·메모를 한 번에 검색합니다.
                <br />
                검색을 닫으면 작성 중이던 화면으로 돌아갑니다.
              </p>
            </div>
          )}
        </div>
      </dialog>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
