import { useEffect, useId, useRef, type ReactNode } from "react";

import { discardChanges, isConfirmOpen } from "../confirm";
import { setDraftDirty } from "../drafts";

export function Sheet({
  title,
  onClose,
  busy,
  children,
  dirty = false,
  className = "",
  size = "md",
  closeButton = true,
  submitShortcut = false,
}: {
  title: string;
  onClose: () => void;
  busy: boolean;
  children: ReactNode;
  dirty?: boolean;
  className?: string;
  /** sm 480px for short forms (memo, call), md 600px otherwise. */
  size?: "sm" | "md";
  /** Editors close with their own 취소 button and Esc (TASK-EDITOR-01). */
  closeButton?: boolean;
  /** Ctrl+Enter submits the sheet's form; shows the hint in the header. */
  submitShortcut?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const draftId = useId();
  useEffect(() => {
    setDraftDirty(draftId, dirty);
    return () => setDraftDirty(draftId, false);
  }, [draftId, dirty]);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    element?.showModal();
    // Native dialog opening may focus the header button after React autoFocus.
    // Pick the first visible enabled field after showModal has laid out its body.
    const firstField = Array.from(
      element?.querySelectorAll<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >("input, textarea, select") ?? [],
    ).find(
      (field) =>
        !field.matches(":disabled") &&
        field.getClientRects().length > 0 &&
        window.getComputedStyle(field).visibility !== "hidden",
    );
    firstField?.focus();
    if (submitShortcut)
      element
        ?.querySelector("form .editor-header-actions button:not([type=button])")
        ?.setAttribute("aria-keyshortcuts", "Control+Enter");
    return () => {
      element?.close();
      previous?.focus();
    };
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const requestClose = async () => {
    if (busy || isConfirmOpen()) return;
    if (!dirty || (await discardChanges())) onClose();
  };
  const submitOnShortcut = (event: React.KeyboardEvent<HTMLDialogElement>) => {
    if (!submitShortcut || event.key !== "Enter" || !(event.ctrlKey || event.metaKey)) return;
    if (busy || isConfirmOpen()) return;
    const form = dialog.current?.querySelector("form");
    if (!form) return;
    event.preventDefault();
    form.requestSubmit();
  };
  return (
    <dialog
      ref={dialog}
      className={`sheet sheet-${size} ${className}`}
      aria-label={title}
      onKeyDown={submitOnShortcut}
      onCancel={(event) => {
        event.preventDefault();
        void requestClose();
      }}
    >
      <header className="sheet-header">
        <h2>{title}</h2>
        {submitShortcut && (
          <small className="shortcut-hint" aria-hidden="true">
            Ctrl+Enter 저장
          </small>
        )}
        {closeButton && (
          <button
            type="button"
            disabled={busy}
            onClick={requestClose}
            aria-label={`${title} 닫기`}
          >
            닫기
          </button>
        )}
      </header>
      {children}
    </dialog>
  );
}
