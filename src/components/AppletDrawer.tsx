import { useState } from "react";
import {
  APPLET_CATEGORIES,
  CORE_APPLETS,
  MODULE_APPLETS,
  moduleOrder,
  visibleModules,
  withModules,
} from "../../shared/applets.mjs";
import type { Data } from "../types";
import { Icon } from "./Icon";
import { Sheet } from "./Sheet";

/**
 * 모듈 관리 (TASK-MODULES-02): show/hide and order the built-in job modules. Each change
 * saves at once. Hiding only takes a module out of the menu; its records, reminders and
 * calendar/briefing entries stay. The core four cannot be turned off.
 */
export function AppletDrawer({
  data,
  busy,
  readOnly,
  error,
  save,
  onClose,
}: {
  data: Data;
  busy: boolean;
  readOnly: boolean;
  /** The app's last save error; shown here because the sheet covers the page banner. */
  error: string;
  save: (next: Data) => Promise<boolean>;
  onClose: () => void;
}) {
  const [status, setStatus] = useState("");
  const [failed, setFailed] = useState(false);
  const shown = visibleModules(data);
  const order = moduleOrder(data);
  async function apply(nextShown: string[], nextOrder: string[], message: string) {
    const inOrder = nextOrder.filter((id) => nextShown.includes(id));
    const modules = withModules(data, inOrder);
    // Keep hidden modules' positions too, so turning one back on returns it to its place.
    modules.moduleOrder = [...nextOrder, ...modules.moduleOrder.filter((id) => !nextOrder.includes(id))];
    const ok = await save({ ...data, modules });
    setFailed(!ok);
    setStatus(ok ? message : "");
  }
  // aria-disabled, not disabled: keyboard focus stays put while saving or at the list ends.
  const locked = busy || readOnly;
  function toggle(id: string, name: string) {
    if (locked) return;
    const on = shown.includes(id);
    void apply(on ? shown.filter((x) => x !== id) : [...shown, id], order, `${name}을(를) 메뉴에서 ${on ? "숨겼습니다" : "보이게 했습니다"}.`);
  }
  function move(id: string, name: string, step: -1 | 1) {
    if (locked) return;
    const at = order.indexOf(id);
    const to = at + step;
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    [next[at], next[to]] = [next[to], next[at]];
    void apply(shown, next, `${name}을(를) ${step < 0 ? "위로" : "아래로"} 옮겼습니다.`);
  }
  return (
    <Sheet title="모듈 관리" busy={busy} onClose={onClose} size="sm" className="applet-drawer">
      <div className="editor">
        <p className="editor-intro">
          메뉴에 보일 업무 모듈을 고릅니다. 숨겨도 기록·알림·달력·브리핑은 그대로이고, 다시 켜면 그대로 보입니다.
        </p>
        {readOnly && (
          <p className="error" role="note">
            읽기 전용 자료라 모듈 설정을 바꿀 수 없습니다. 새 버전 앱에서 바꾸세요.
          </p>
        )}
        <h3 className="applet-group-title">기본 (항상 표시)</h3>
        <ul className="applet-list">
          {CORE_APPLETS.map((a) => (
            <li key={a.id}>
              <Icon name={a.icon} />
              <span className="applet-name">{a.name}</span>
              <span className="muted">항상 표시</span>
            </li>
          ))}
        </ul>
        <h3 className="applet-group-title">업무 모듈</h3>
        <ul className="applet-list">
          {order.map((id, index) => {
            const a = MODULE_APPLETS.find((m) => m.id === id)!;
            const on = shown.includes(id);
            return (
              <li key={id}>
                <Icon name={a.icon} />
                <label className="applet-toggle">
                  <input
                    type="checkbox"
                    role="switch"
                    checked={on}
                    aria-disabled={locked || undefined}
                    onChange={() => toggle(id, a.name)}
                  />
                  <span className="applet-name">{a.name}</span>
                  <small className="muted">
                    {APPLET_CATEGORIES[a.category as keyof typeof APPLET_CATEGORIES]} · {a.description}
                  </small>
                </label>
                <span className="applet-move">
                  <button
                    type="button"
                    className="text-button"
                    aria-disabled={locked || index === 0 || undefined}
                    aria-label={`위로 · ${a.name}`}
                    onClick={() => move(id, a.name, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    aria-disabled={locked || index === order.length - 1 || undefined}
                    aria-label={`아래로 · ${a.name}`}
                    onClick={() => move(id, a.name, 1)}
                  >
                    ↓
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
        <p className="list-count" role="status" aria-atomic="true">
          {status}
        </p>
        {failed && error && (
          <p className="error" role="alert">
            바꾸지 못했습니다. {error}
          </p>
        )}
      </div>
    </Sheet>
  );
}
