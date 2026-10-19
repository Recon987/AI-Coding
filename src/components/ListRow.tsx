import type { KeyboardEvent, ReactNode } from "react";

export type RowAction = {
  label: string;
  onClick: () => void;
  tone?: "danger";
  /** 상태를 바꾸는 동작(처리 완료·오늘 해제 등)은 테두리 버튼, 나머지는 글자 버튼(TASK-LIST-02). */
  primary?: boolean;
  /** Overrides the default accessible name "<label> · <row title>". */
  ariaLabel?: string;
};

/**
 * One scannable line per record (TASK-LIST-01): 일시 · 상태 · 유형 · 제목 · 담당.
 * Details expand in place; actions are secondary so each screen keeps one primary button.
 */
export function ListRow({
  when,
  status,
  kind,
  title,
  subtitle,
  owner,
  done = false,
  busy,
  actions,
  className = "",
  children,
}: {
  when?: ReactNode;
  status?: ReactNode;
  kind?: ReactNode;
  title: string;
  subtitle?: ReactNode;
  owner?: ReactNode;
  done?: boolean;
  busy: boolean;
  actions: RowAction[];
  className?: string;
  children?: ReactNode;
}) {
  return (
    <article className={`record list-row ${done ? "finished" : ""} ${className}`}>
      <details className="record-details">
        <summary>
          <span className="row-when">{when}</span>
          <span className="row-status">{status}</span>
          <span className="row-kind">{kind}</span>
          <div className="row-main">
            <h3 className={done ? "done" : ""}>{title}</h3>
            {subtitle && <span className="record-preview">{subtitle}</span>}
          </div>
          <span className="row-owner">{owner}</span>
        </summary>
        {children && <div className="record-detail-body">{children}</div>}
      </details>
      <div className="record-actions">
        {actions.map((action, index) => (
          <button
            // Index key: a toggled label ("처리 완료" → "미처리로 변경") keeps the same button and focus.
            key={index}
            type="button"
            // aria-disabled keeps keyboard focus on the button while a save runs (TASK-EDITOR-02).
            aria-disabled={busy || undefined}
            aria-label={action.ariaLabel}
            className={action.tone === "danger" ? "text-button danger" : action.primary ? "" : "text-button"}
            onClick={() => {
              if (!busy) action.onClick();
            }}
          >
            {action.label}
            {/* Screen readers hear which record ("삭제 · 오전 순찰"); the visible label stays first. */}
            {!action.ariaLabel && <span className="sr-only"> · {title}</span>}
          </button>
        ))}
      </div>
    </article>
  );
}

/** ↑/↓ move between rows of the same list; Enter/Space keep the native details toggle. */
export function rowKeys(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  const current = (event.target as HTMLElement).closest(".list-row > .record-details > summary");
  if (!current) return;
  const rows = [...event.currentTarget.querySelectorAll<HTMLElement>(".list-row > .record-details > summary")];
  const next = rows[rows.indexOf(current as HTMLElement) + (event.key === "ArrowDown" ? 1 : -1)];
  if (!next) return;
  event.preventDefault();
  next.focus();
}

/**
 * compact: lists without a date (memos, calls) show 상태 · 제목 · ownerLabel only.
 * plain: memos have no status or owner, so only 제목 remains (TASK-LIST-02).
 * Render it inside `.row-list` so its columns line up with the rows and the action column.
 */
export function ListHeader({
  compact = false,
  plain = false,
  ownerLabel = "담당",
  whenLabel = "일시",
  statusLabel = "상태",
  kindLabel = "유형",
}: {
  compact?: boolean;
  plain?: boolean;
  ownerLabel?: string;
  whenLabel?: string;
  statusLabel?: string;
  kindLabel?: string;
}) {
  return (
    <div className="list-header" aria-hidden="true">
      <div className="list-header-cols">
        {!compact && !plain && <span>{whenLabel}</span>}
        {!plain && <span>{statusLabel}</span>}
        {!compact && !plain && <span>{kindLabel}</span>}
        <span>제목</span>
        {!plain && <span>{ownerLabel}</span>}
      </div>
      <span />
    </div>
  );
}
