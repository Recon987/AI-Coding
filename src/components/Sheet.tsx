import { useEffect, useId, useRef, type ReactNode } from "react";

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
  const requestClose = () => {
    if (
      !busy &&
      (!dirty ||
        confirm("저장하지 않은 변경 사항이 있습니다. 변경을 버리고 닫을까요?"))
    )
      onClose();
  };
  return (
    <dialog
      ref={dialog}
      className={`sheet ${className}`}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
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
