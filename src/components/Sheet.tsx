import { useEffect, useRef, type ReactNode } from "react";
export function Sheet({
  title,
  onClose,
  busy,
  children,
}: {
  title: string;
  onClose: () => void;
  busy: boolean;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    element?.showModal();
    return () => {
      element?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="sheet"
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <header className="sheet-header">
        <h2>{title}</h2>
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          aria-label="근무 편집 닫기"
        >
          닫기 ×
        </button>
      </header>
      {children}
    </dialog>
  );
}
