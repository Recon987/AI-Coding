import { useEffect, useState } from "react";
import type { DesktopSettings as Settings } from "../types";
import { SectionHead } from "../ui";

export function DesktopSettings() {
  const [settings, setSettings] = useState<Settings>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    window.workdesk
      ?.getDesktopSettings()
      .then((value) => {
        if (active) setSettings(value);
      })
      .catch((e) => {
        if (active) setError(String(e));
      });
    return () => {
      active = false;
    };
  }, []);
  const toggle = async (enabled: boolean) => {
    if (!window.workdesk || busy) return;
    setBusy(true);
    setError("");
    try {
      setSettings(await window.workdesk.setCloseToTray(enabled));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="panel desktop-settings">
      <SectionHead title="트레이와 알림" />
      <label className="tray-setting">
        <input
          type="checkbox"
          checked={settings?.closeToTray ?? false}
          disabled={!settings || busy}
          onChange={(event) => void toggle(event.target.checked)}
        />
        <span>창을 닫아도 시스템 트레이에 유지</span>
      </label>
      <p className="help">
        기본값은 꺼짐입니다. 켜면 닫기 버튼은 창을 숨기며, 작업 표시줄의 트레이
        아이콘에서 창을 다시 열거나 앱을 종료할 수 있습니다. Windows 시작 시
        자동 실행되지는 않습니다.
      </p>
      {settings && (
        <p role="status">
          {settings.closeToTray && settings.trayAvailable
            ? "트레이 상주 켜짐 · 창을 숨겨도 알림을 확인합니다."
            : "트레이 상주 꺼짐 · 창을 닫으면 앱이 종료됩니다."}
        </p>
      )}
      {settings?.message && <p role="alert">{settings.message}</p>}
      {error && <p role="alert">{error}</p>}
      {!window.workdesk && (
        <p className="help">설치형 데스크톱 앱에서 설정할 수 있습니다.</p>
      )}
      <h3>절전에서 돌아왔을 때</h3>
      <p className="help">
        실행 중에는 15초마다 알림을 점검합니다. 절전 복귀 시 지난 24시간의
        미완료 일정과 업무 알림을 확인하며, 이미 알림을 요청한 회차는 다시
        요청하지 않습니다. 여러 건은 하나의 요약 알림으로 표시합니다.
      </p>
      <p className="help">
        Windows 알림 허용이 필요하며 집중 지원 등 PC 설정에 따라 표시되지 않을
        수 있습니다. 앱이 종료된 동안에는 알림이 동작하지 않습니다.
      </p>
    </section>
  );
}
