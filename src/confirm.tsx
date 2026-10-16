import { useEffect, useRef, useState } from "react";

// In-app replacement for window.confirm. Native JS dialogs opened over a modal
// <dialog> crashed Electron (TASK-CONFIRM-01); this keeps every choice in the DOM.
export type ConfirmRequest = {
  message: string;
  detail?: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
};
type Pending = ConfirmRequest & { resolve: (ok: boolean) => void };

let pending: Pending | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

/** Resolves true only when the confirm button is chosen. A second request while one is open is refused. */
export function askConfirm(request: ConfirmRequest): Promise<boolean> {
  if (pending) return Promise.resolve(false);
  return new Promise((resolve) => {
    pending = { ...request, resolve };
    notify();
  });
}
export const isConfirmOpen = () => pending !== null;

export const discardChanges = (action = "닫을까요?") =>
  askConfirm({
    message: `저장하지 않은 변경 사항이 있습니다. 변경을 버리고 ${action}`,
    confirmLabel: "변경 버리기",
    cancelLabel: "계속 작성",
    danger: true,
  });
export const confirmDelete = (target: string) =>
  askConfirm({
    message: `${target}을(를) 삭제할까요?`,
    detail: "삭제한 기록은 백업에서만 되살릴 수 있습니다.",
    confirmLabel: "삭제",
    danger: true,
  });

export function ConfirmHost() {
  const [request, setRequest] = useState<Pending | null>(pending);
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const update = () => setRequest(pending);
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);
  useEffect(() => {
    if (!request) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    cancel.current?.focus();
    return () => {
      dialog.current?.close();
      previous?.focus();
    };
  }, [request]);
  if (!request) return null;
  const finish = (ok: boolean) => {
    const current = pending;
    pending = null;
    notify();
    current?.resolve(ok);
  };
  return (
    <dialog
      ref={dialog}
      className="confirm-dialog"
      role="alertdialog"
      aria-labelledby="confirm-message"
      aria-describedby={request.detail ? "confirm-detail" : undefined}
      onCancel={(event) => {
        event.preventDefault();
        finish(false);
      }}
    >
      <p id="confirm-message" className="confirm-message">
        {request.message}
      </p>
      {request.detail && (
        <p id="confirm-detail" className="help">
          {request.detail}
        </p>
      )}
      <div className="confirm-actions">
        <button ref={cancel} type="button" onClick={() => finish(false)}>
          {request.cancelLabel ?? "취소"}
        </button>
        <button
          type="button"
          className={request.danger ? "danger-button" : "primary"}
          onClick={() => finish(true)}
        >
          {request.confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
