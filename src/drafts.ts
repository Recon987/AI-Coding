const dirtyEditors = new Set<string>();
const listeners = new Set<() => void>();
export function setDraftDirty(id: string, dirty: boolean) {
  const before = dirtyEditors.size;
  if (dirty) dirtyEditors.add(id);
  else dirtyEditors.delete(id);
  if (before !== dirtyEditors.size)
    for (const listener of listeners) listener();
}
export function hasDirtyDrafts() {
  return dirtyEditors.size > 0;
}
export function subscribeDirty(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
