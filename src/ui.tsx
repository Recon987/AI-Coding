import {
  cloneElement,
  isValidElement,
  useId,
  type ReactNode,
  type ReactElement,
} from "react";
export { formatDate, formatClock, formatTime } from "../shared/format.mjs";
import { formatClock as clock } from "../shared/format.mjs";
/** Derived calendar rows: closures span whole days, everything else has a time. */
export const itemClock = (item: { category: string; at: string }) =>
  item.category === "통제" ? "종일" : clock(item.at);
export const categoryTone = (category: string) =>
  category === "순찰"
    ? "patrol"
    : category === "통제"
      ? "control"
      : category === "일정"
        ? ""
        : "task";
export function localInput(at = new Date().toISOString()) {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
export const riskNames = {
  normal: "일반 기록",
  attention: "확인 필요",
  urgent: "우선 확인",
};
export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="empty">
      <span aria-hidden="true">＋</span>
      <p>{children}</p>
    </div>
  );
}
export function Tag({
  children,
  tone = "",
}: {
  children: ReactNode;
  /** Status (danger/warning), category (patrol/task/holiday) or work status (duty). */
  tone?: "" | "danger" | "warning" | "patrol" | "task" | "holiday" | "duty" | "control";
}) {
  return <span className={`tag ${tone}`}>{children}</span>;
}
/**
 * Label + control. A `required` control shows "(필수)" (the native required state is
 * what screen readers announce). `hint` and `error` sit under the control and are
 * linked with aria-describedby; an error also sets aria-invalid (TASK-EDITOR-02).
 */
export function Field({
  label,
  children,
  hint,
  error,
}: {
  label: string;
  children: ReactNode;
  hint?: ReactNode;
  error?: string;
}) {
  const generatedId = useId();
  const control = isValidElement(children)
    ? (children as ReactElement<{
        id?: string;
        required?: boolean;
        "aria-labelledby"?: string;
        "aria-describedby"?: string;
        "aria-invalid"?: boolean;
      }>)
    : null;
  const controlId = control?.props.id || generatedId;
  const labelId = `${generatedId}-label`;
  const hintId = hint ? `${generatedId}-hint` : undefined;
  const errorId = error ? `${generatedId}-error` : undefined;
  const describedBy =
    [control?.props["aria-describedby"], hintId, errorId].filter(Boolean).join(" ") ||
    undefined;
  return (
    <label className="field" htmlFor={controlId}>
      <span className="field-label">
        <span id={labelId}>{label}</span>
        {control?.props.required && (
          <small className="required-mark" aria-hidden="true">
            필수
          </small>
        )}
      </span>
      {control
        ? cloneElement(control, {
            id: controlId,
            "aria-labelledby": control.props["aria-labelledby"] || labelId,
            "aria-describedby": describedBy,
            "aria-invalid": error ? true : control.props["aria-invalid"],
          })
        : children}
      {hint && (
        <small id={hintId} className="field-hint">
          {hint}
        </small>
      )}
      {error && (
        <small id={errorId} className="field-error" role="alert">
          {error}
        </small>
      )}
    </label>
  );
}

/** After a rejected submit, move to the first field the form marks invalid. */
export function focusFirstInvalid(form: HTMLFormElement | null) {
  requestAnimationFrame(() =>
    form?.querySelector<HTMLElement>('[aria-invalid="true"], :invalid')?.focus(),
  );
}
export function SectionHead({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-head">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}
