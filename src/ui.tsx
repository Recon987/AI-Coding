import {
  cloneElement,
  isValidElement,
  useId,
  type ReactNode,
  type ReactElement,
} from "react";
export { formatDate, formatClock, formatTime } from "../shared/format.mjs";
import { RISK_LABEL } from "../shared/model.mjs";
import { formatClock as clock } from "../shared/format.mjs";
/** Derived calendar rows: closures and AX milestones span whole days, everything else has a time. */
export const itemClock = (item: { category: string; at: string }) =>
  item.category === "통제" || item.category === "AX" ? "종일" : clock(item.at);
export const categoryTone = (category: string) =>
  category === "순찰"
    ? "patrol"
    : category === "통제"
      ? "control"
      : category === "일정"
        ? ""
        : category === "AX"
          ? "ax"
          : "task";
export function localInput(at = new Date().toISOString()) {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
// Labels live in shared/model.mjs so forms and validation use the same words (TASK-LABELS-01).
export const riskNames = RISK_LABEL;
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
  tone?: "" | "danger" | "warning" | "patrol" | "task" | "holiday" | "duty" | "control" | "ax";
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
  requestAnimationFrame(() => {
    if (!form?.isConnected) return;
    const field = Array.from(
      form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        "input, select, textarea",
      ),
    ).find(
      (control) =>
        !control.matches(":disabled") &&
        control.matches('[aria-invalid="true"], :invalid'),
    );
    if (!field) return;
    // 접힌 좌표/단속 영역 안의 오류도 펼쳐야 실제 입력으로 이동할 수 있다.
    for (let parent = field.parentElement; parent && parent !== form; parent = parent.parentElement)
      if (parent instanceof HTMLDetailsElement) parent.open = true;
    field.focus();
  });
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
