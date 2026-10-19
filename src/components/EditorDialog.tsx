import { useState, type ReactNode } from "react";
import { discardChanges } from "../confirm";
import { Sheet } from "./Sheet";

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
  const closeEditor = async () => {
    if (!dirty || (await discardChanges())) finishEditor();
  };
  const openEditor = async (value: T) => {
    if (isOpen && dirty && !(await discardChanges("새로 열까요?"))) return false;
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
  size,
  children,
}: {
  title: string;
  busy: boolean;
  dirty: boolean;
  /** Called after Sheet confirms discard. Pass finishEditor, not closeEditor. */
  onClose: () => void;
  error: string;
  size?: "sm" | "md";
  children: ReactNode;
}) {
  return (
    <Sheet
      title={title}
      busy={busy}
      dirty={dirty}
      onClose={onClose}
      className="editor-dialog"
      size={size}
      closeButton={false}
      submitShortcut
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
