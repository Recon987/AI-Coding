import {
  cloneElement,
  isValidElement,
  useId,
  type ReactNode,
  type ReactElement,
} from "react";
export { formatDate, formatClock, formatTime } from "../shared/format.mjs";
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
  tone?: "" | "danger" | "warning" | "patrol" | "task" | "holiday" | "duty";
}) {
  return <span className={`tag ${tone}`}>{children}</span>;
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const generatedId = useId();
  const control = isValidElement(children)
    ? (children as ReactElement<{ id?: string; "aria-labelledby"?: string }>)
    : null;
  const controlId = control?.props.id || generatedId;
  const labelId = `${generatedId}-label`;
  return (
    <label className="field" htmlFor={controlId}>
      <span id={labelId}>{label}</span>
      {control
        ? cloneElement(control, {
            id: controlId,
            "aria-labelledby": control.props["aria-labelledby"] || labelId,
          })
        : children}
    </label>
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
