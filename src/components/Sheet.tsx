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
}: {
  title: string;
  onClose: () => void;
  busy: boolean;
  children: ReactNode;
  dirty?: boolean;
  className?: string;
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
  return (
    <dialog
      ref={dialog}
      className={`sheet ${className}`}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        void requestClose();
      }}
    >
      <header className="sheet-header">
        <h2>{title}</h2>
        <button
          type="button"
          disabled={busy}
          onClick={requestClose}
          aria-label={`${title} 닫기`}
        >
          닫기 ×
        </button>
      </header>
      {children}
    </dialog>
  );
}
