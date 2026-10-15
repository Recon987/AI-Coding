import { useState, type ReactNode } from "react";
import { Sheet } from "./Sheet";

const discardMessage =
  "저장하지 않은 변경 사항이 있습니다. 변경을 버리고 닫을까요?";

export function useEditorDraft<T>(initial: T, initiallyOpen = false) {
  const [draft, setDraft] = useState(initial);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial));
  const [isOpen, setOpen] = useState(initiallyOpen);
  const [saveError, setSaveError] = useState("");
  const [extraDirty, setExtraDirty] = useState(false);
  const dirty = extraDirty || JSON.stringify(draft) !== baseline;
  // Bypass the guard only after a successful save or Sheet's confirmed close.
  const finishEditor = () => {
    setOpen(false);
    setSaveError("");
    setExtraDirty(false);
  };
  const closeEditor = () => {
    if (!dirty || confirm(discardMessage)) finishEditor();
  };
  const openEditor = (value: T) => {
    if (isOpen && dirty && !confirm(discardMessage)) return false;
    setDraft(value);
    setBaseline(JSON.stringify(value));
    setExtraDirty(false);
    setSaveError("");
    setOpen(true);
    return true;
  };
  return {
    draft,
    setDraft,
    isOpen,
    dirty,
    saveError,
    setSaveError,
    setExtraDirty,
    openEditor,
    closeEditor,
    finishEditor,
  };
}

export function EditorDialog({
  title,
  busy,
  dirty,
  onClose,
  error,
  children,
}: {
  title: string;
  busy: boolean;
  dirty: boolean;
  /** Called after Sheet confirms discard. Pass finishEditor, not closeEditor. */
  onClose: () => void;
  error: string;
  children: ReactNode;
}) {
  return (
    <Sheet
      title={title}
      busy={busy}
      dirty={dirty}
      onClose={onClose}
      className="editor-dialog"
    >
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {children}
    </Sheet>
  );
}
