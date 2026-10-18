import type { KeyboardEvent, ReactNode } from "react";

export type RowAction = {
  label: string;
  onClick: () => void;
  tone?: "danger";
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
            key={action.label}
            type="button"
            disabled={busy}
            aria-label={action.ariaLabel}
            className={action.tone === "danger" ? "text-button danger" : index === 0 ? "" : "text-button"}
            onClick={action.onClick}
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

/** compact: lists without a date (memos, calls) show 상태 · 제목 · ownerLabel only. */
export function ListHeader({ compact = false, ownerLabel = "담당" }: { compact?: boolean; ownerLabel?: string }) {
  return (
    <div className={`list-header ${compact ? "compact" : ""}`} aria-hidden="true">
      {!compact && <span>일시</span>}
      <span>상태</span>
      {!compact && <span>유형</span>}
      <span>제목</span>
      <span>{ownerLabel}</span>
    </div>
  );
}
