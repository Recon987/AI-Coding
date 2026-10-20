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
  isNewerData,
  NEWER_DATA_MESSAGE,
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
import { HolidayManager } from "./components/HolidayManager";
import { ZoneManager } from "./components/ZoneManager";
import { SecuritySheet, UnlockScreen } from "./components/Security";
import { BackupSheet } from "./components/BackupSheet";
import { Icon } from "./components/Icon";
import { AppletDrawer } from "./components/AppletDrawer";
import { AxDesk } from "./components/AxDesk";
import { AxSnippets } from "./components/AxSnippets";
import { AxReport } from "./components/AxReport";
import { CORE_APPLETS, MODULE_APPLETS, rememberPage, restorePage, visibleModules } from "../shared/applets.mjs";
import { Empty, SectionHead, Tag } from "./ui";
import "./style.css";
import { ConfirmHost, discardChanges, isConfirmOpen } from "./confirm";
// TASK-MODULES-02: the sidebar shows the four core applets, then the job modules the
// user keeps visible (shared/applets.mjs), then 모듈 관리·바로가기·앱 안내. Page IDs are unchanged,
// so links from search, the briefing and the calendar still open the same screens.
const pageNames: Record<Page, string> = {
  briefing: "업무 브리핑",
  calendar: "월간 일정",
  handover: "인수인계",
  submission: "제출 기한",
  notes: "업무 메모",
  calls: "전화메모",
  patrol: "현장 순찰",
  controls: "탐방로 통제",
  office: "사무소 현황",
  ax: "AX 사업 관리",
  "ax-snippets": "GIS·AI 스니펫",
  "ax-report": "보고서 초안",
  folders: "바로가기",
  about: "앱 안내",
};
type Applet = { id: string; name: string; navName?: string; icon: string; pages: string[] };
const APPLETS: Applet[] = [...CORE_APPLETS, ...MODULE_APPLETS];
const appletOf = (page: Page) => APPLETS.find((a) => a.pages.includes(page));
const subtitles: Record<Page, string> = {
  ax: "권역별 AX 사업의 단계·사업비 집행·차기 마일스톤을 관리합니다.",
  "ax-snippets": "자주 쓰는 GEE·Python 코드와 프롬프트, 법령·지침 문구를 보관하고 복사합니다.",
  "ax-report": "등록한 사업 정보로 4개 절 보고서 초안을 만들어 복사하거나 TXT·MD로 저장합니다.",
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
// TASK-NAV-02: which page each multi-page tool was last on. A window preference only, never
// in workdesk.json; unreadable or unknown values are ignored.
const LAST_PAGE_KEY = "park-workdesk-last-page";
function readLastPages(): Record<string, string> {
  try {
    const value = JSON.parse(localStorage.getItem(LAST_PAGE_KEY) ?? "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}
const READ_ONLY_BLOCKED =
  "읽기 전용 자료라 저장·백업·복원을 하지 않았습니다. 새 버전 앱에서 작업하세요.";
function App() {
  const [data, setData] = useState<Data>(empty),
    [page, setPage] = useState<Page>("briefing"),
    [focusId, setFocusId] = useState<string>(),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    // TASK-SCHEMA-01: a newer app's file is shown but never saved from this version.
    [readOnly, setReadOnly] = useState(false),
    // TASK-HOLIDAY-01: user-added holidays sheet, opened from 자료 관리.
    [holidaysOpen, setHolidaysOpen] = useState(false),
    [zonesOpen, setZonesOpen] = useState(false),
    // TASK-SECURITY-02: 저장 암호화 sheet.
    [securityOpen, setSecurityOpen] = useState(false),
    // TASK-SECURITY-03: backup password (backup) or the password of a picked backup (restore).
    [backupSheet, setBackupSheet] = useState<null | { mode: "backup" } | { mode: "restore"; name: string }>(null),
    // TASK-MODULES-02: 모듈 관리 drawer.
    [modulesOpen, setModulesOpen] = useState(false),
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
  const [lastPages, setLastPages] = useState(readLastPages);
  useEffect(() => {
    const next = rememberPage(lastPages, page);
    if (next === lastPages) return;
    setLastPages(next);
    try {
      localStorage.setItem(LAST_PAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable: remembering is a convenience, so keep working without it.
    }
  }, [page, lastPages]);
  const shownModules = visibleModules(data);
  const currentApplet = appletOf(page);
  // A page of a hidden module still opens (search, briefing, calendar links); it says so.
  const hiddenModule =
    currentApplet && MODULE_APPLETS.some((m) => m.id === currentApplet.id) && !shownModules.includes(currentApplet.id)
      ? currentApplet
      : undefined;
  const saving = useRef(false);
  const api = window.workdesk;
  useEffect(() => {
    (async () => {
      try {
        if (api) {
          const loaded = await api.load();
          const newer = isNewerData(loaded);
          setReadOnly(newer);
          setData(normalize(loaded, { allowNewer: newer }));
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
      if (readOnly) {
        setError(READ_ONLY_BLOCKED);
        return false;
      }
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
    [api, readOnly],
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
  // Whatever failed in a restore, show what is on disk now, so a later save cannot write
  // stale screen data over a restore that did commit (DS-01).
  async function reloadAfterRestoreError() {
    if (!api) return;
    try {
      const current = await api.load();
      setData(normalize(current, { allowNewer: isNewerData(current) }));
    } catch {
      // Keep the error shown; the next start reads the file again.
    }
  }
  function applyRestored(next: Data) {
    setData(normalize(next));
    setFocusId(undefined);
    setPage("briefing");
    setFeedback("백업 자료를 복원했습니다.");
  }
  async function backup(restore = false) {
    if (saving.current) return;
    if (readOnly) {
      setError(READ_ONLY_BLOCKED);
      return;
    }
    // TASK-SECURITY-03: a backup always starts with its password.
    if (!restore) {
      setBackupSheet({ mode: "backup" });
      return;
    }
    saving.current = true;
    setBusy(true);
    try {
      const result = await api?.restore();
      if (result && "needsPassword" in result) setBackupSheet({ mode: "restore", name: result.name });
      else if (result) applyRestored(result.data);
      setError((await api?.takeNotice()) ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "백업 작업에 실패했습니다.");
      await reloadAfterRestoreError();
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  // The sheet's password step; throws so the sheet shows the reason and the user may retry.
  async function submitBackupPassword(password: string) {
    if (!api || !backupSheet || saving.current) return;
    saving.current = true;
    setBusy(true);
    try {
      if (backupSheet.mode === "backup") {
        if (await api.backup(password)) setFeedback("백업을 암호로 잠가 저장했습니다.");
        setBackupSheet(null);
        setError("");
        return;
      }
      let result;
      try {
        result = await api.restorePassword(password);
      } catch (e) {
        await reloadAfterRestoreError();
        throw e;
      }
      setBackupSheet(null);
      if (result) applyRestored(result.data);
      setError((await api.takeNotice()) ?? "");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  function closeBackupSheet() {
    if (backupSheet?.mode === "restore") void api?.restoreCancel();
    setBackupSheet(null);
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
        <nav aria-label="주 메뉴">
          {[
            { label: "기본", applets: CORE_APPLETS as Applet[] },
            {
              label: "모듈",
              applets: shownModules
                .map((id) => MODULE_APPLETS.find((m) => m.id === id))
                .filter(Boolean) as Applet[],
            },
          ].map((section) =>
            section.applets.length ? (
              <div className="nav-section" key={section.label}>
                <p>{section.label}</p>
                {section.applets.map((a) => {
                  const here = a.pages.includes(page);
                  const count =
                    a.id === "patrols"
                      ? activeControls(data, dayKey()).length
                      : a.id === "memos"
                        ? data.calls.filter((c) => !c.done).length
                        : a.id === "tasks"
                          ? data.tasks.filter((t) => !t.done).length
                          : 0;
                  return (
                    <button
                      key={a.id}
                      aria-disabled={busy || undefined}
                      className={here ? "active" : ""}
                      aria-current={here ? "page" : undefined}
                      // Opens the page last used in this tool (TASK-NAV-02); inside it, stays put.
                      onClick={() => navigate(here ? page : (restorePage(a, lastPages) as Page))}
                      aria-label={a.name}
                    >
                      <Icon name={a.icon} />
                      {a.navName ?? a.name}
                      {count ? (
                        <small className="nav-count" aria-hidden="true">
                          {count}
                        </small>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null,
          )}
          <div className="nav-section nav-footer">
            <button
              aria-disabled={busy || undefined}
              aria-haspopup="dialog"
              onClick={() => !busy && setModulesOpen(true)}
            >
              <Icon name="modules" />
              모듈 관리
            </button>
            {(["folders", "about"] as Page[]).map((id) => (
              <button
                key={id}
                aria-disabled={busy || undefined}
                className={page === id ? "active" : ""}
                aria-current={page === id ? "page" : undefined}
                onClick={() => navigate(id)}
                aria-label={pageNames[id]}
              >
                <Icon name={id} />
                {pageNames[id]}
              </button>
            ))}
          </div>
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
              className={`save-indicator ${dirty || readOnly ? "unsaved" : ""}`}
              role="status"
              data-state={
                readOnly ? "read-only" : busy ? "busy" : dirty ? "unsaved" : ready ? "ready" : "loading"
              }
            >
              <Icon
                name={readOnly ? "notes" : busy ? "clock" : dirty ? "notes" : "check"}
                size={14}
              />
              {readOnly
                ? "읽기 전용"
                : busy
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
                <button
                  disabled={!ready || busy}
                  onClick={(event) => {
                    event.currentTarget
                      .closest("details")
                      ?.removeAttribute("open");
                    setHolidaysOpen(true);
                  }}
                >
                  <Icon name="calendar" size={16} />
                  공휴일 관리
                </button>
                <button
                  disabled={busy}
                  onClick={(event) => {
                    event.currentTarget
                      .closest("details")
                      ?.removeAttribute("open");
                    setZonesOpen(true);
                  }}
                >
                  <Icon name="patrol" size={16} />
                  담당구역 목록
                </button>
                <button
                  disabled={!api || !ready || busy}
                  onClick={(event) => {
                    event.currentTarget
                      .closest("details")
                      ?.removeAttribute("open");
                    setSecurityOpen(true);
                  }}
                >
                  <Icon name="lock" size={16} />
                  저장 암호화
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
          {/* Toast before the page switch: Tab from the top bar reaches it first (fixed position). */}
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
          {currentApplet && currentApplet.pages.length > 1 && (
            <nav className="page-switch" aria-label={`${currentApplet.name} 보기`}>
              {(currentApplet.pages as Page[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-disabled={busy || undefined}
                  className={page === id ? "selected" : ""}
                  aria-current={page === id ? "page" : undefined}
                  onClick={() => page !== id && navigate(id)}
                >
                  {pageNames[id]}
                </button>
              ))}
            </nav>
          )}
          {hiddenModule && (
            <p className="hidden-module-note" role="note">
              {hiddenModule.name} 모듈은 메뉴에서 숨겨져 있습니다. 자료는 그대로이며 모듈 관리에서 다시 켤 수 있습니다.{" "}
              <button type="button" className="text-button" onClick={() => setModulesOpen(true)}>
                모듈 관리 열기
              </button>
            </p>
          )}
          {!api && (
            <div className="notice">
              화면 체험 중입니다. 브라우저 기록은 데스크톱 앱과 별개이며,
              알림·폴더 열기·파일 내보내기는 데스크톱에서 지원합니다.
            </div>
          )}
          {readOnly && (
            <div role="alert" className="error read-only-notice">
              읽기 전용: {NEWER_DATA_MESSAGE}
            </div>
          )}
          {modulesOpen && (
            <AppletDrawer data={data} busy={busy} readOnly={readOnly} error={error} save={save} onClose={() => setModulesOpen(false)} />
          )}
          {holidaysOpen && (
            <HolidayManager data={data} busy={busy} save={save} onClose={() => setHolidaysOpen(false)} />
          )}
          {zonesOpen && (
            <ZoneManager data={data} busy={busy} readOnly={readOnly} save={save} onClose={() => setZonesOpen(false)} />
          )}
          {securityOpen && <SecuritySheet readOnly={readOnly} onClose={() => setSecurityOpen(false)} />}
          {backupSheet && (
            <BackupSheet
              mode={backupSheet.mode}
              name={backupSheet.mode === "restore" ? backupSheet.name : undefined}
              busy={busy}
              onSubmit={submitBackupPassword}
              onClose={closeBackupSheet}
            />
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
              {page === "ax" && (
                <AxDesk
                  key={page + focusId}
                  data={data}
                  save={save}
                  busy={busy}
                  initialId={focusId}
                  openReport={(id) => navigate("ax-report", id)}
                />
              )}
              {page === "ax-report" && <AxReport key={page + focusId} data={data} busy={busy} initialId={focusId} />}
              {page === "ax-snippets" && (
                <AxSnippets key={page + focusId} data={data} save={save} busy={busy} initialId={focusId} />
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
                      폴더에 자동 보관하며, 이 복원 전 보관본은 최근 5개만 남깁니다.
                      오래된 것을 지울 때는 복원 확인창에서 먼저 알려 줍니다.
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
// TASK-SECURITY-02: the startup recovery-key window loads the same page with ?view=unlock.
const unlockView = new URLSearchParams(location.search).get("view") === "unlock";
createRoot(document.getElementById("root")!).render(unlockView ? <UnlockScreen /> : <App />);
