import { useEffect, useState, type FormEvent } from "react";
import type { SecurityStatus } from "../types";
import { Field } from "../ui";
import { Sheet } from "./Sheet";

// Electron prefixes errors thrown in the main process; the user only needs the reason.
export const ipcMessage = (e: unknown, fallback: string) =>
  e instanceof Error ? e.message.replace(/^Error invoking remote method '[^']+': (?:Error: )?/, "") : fallback;

const RECOVERY_RULES = [
  "이 키는 지금 한 번만 보여 줍니다. 앱에서 다시 볼 수 없습니다.",
  "종이에 손으로 적어 PC와 떨어진 잠금 서랍 등에 보관하세요. 인쇄한다면 공용 프린터에 남기지 말고 바로 가져가세요.",
  "사진·메신저·메모 앱·이 PC나 동기화(OneDrive 등) 폴더의 파일로 저장하지 마세요.",
  "공용 PC라면 다른 사람이 보지 않을 때 적으세요. 복구 키를 가진 사람은 누구나 이 자료를 열 수 있습니다.",
  "Windows 계정이나 PC가 바뀌면 이 키로만 자료를 열 수 있습니다. 잃어버리면 아무도 열 수 없습니다.",
];

/**
 * 저장 암호화 (TASK-SECURITY-02): status, and turning it on once with a recovery key the
 * user must type back. The key itself is made and kept only in the main process.
 */
export function SecuritySheet({ readOnly, onClose }: { readOnly: boolean; onClose: () => void }) {
  const api = window.workdesk;
  const [status, setStatus] = useState<SecurityStatus>();
  const [recoveryKey, setRecoveryKey] = useState("");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  useEffect(() => {
    let active = true;
    api
      ?.securityStatus()
      .then((value) => active && setStatus(value))
      .catch((e) => active && setError(ipcMessage(e, "암호화 상태를 확인하지 못했습니다.")));
    return () => {
      active = false;
    };
  }, [api]);
  const close = () => {
    // A recovery key that was shown but not confirmed is thrown away.
    if (recoveryKey) void api?.securityCancel();
    onClose();
  };
  async function prepare() {
    if (!api) return;
    setBusy(true);
    setError("");
    try {
      setRecoveryKey((await api.securityPrepare()).recoveryKey);
    } catch (e) {
      setError(ipcMessage(e, "복구 키를 만들지 못했습니다."));
    } finally {
      setBusy(false);
    }
  }
  async function enable(event: FormEvent) {
    event.preventDefault();
    if (!api) return;
    setBusy(true);
    setError("");
    try {
      const next = await api.securityEnable(typed);
      setStatus(next);
      setRecoveryKey("");
      setTyped("");
      setDone(
        ["저장 암호화를 켰습니다. 업무 자료와 마지막 정상본을 암호화해 다시 저장했습니다.", next.warning]
          .filter(Boolean)
          .join(" "),
      );
    } catch (e) {
      setError(ipcMessage(e, "저장 암호화를 켜지 못했습니다."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet title="저장 암호화" busy={busy} onClose={close} size="md" className="security-sheet">
      <div className="editor">
        <p className="editor-intro">
          업무 자료 파일을 이 PC의 Windows 계정 보호(DPAPI)로 잠근 키로 암호화합니다. PC를 잃어버리거나 파일이 복사돼도 다른
          계정에서는 내용을 읽을 수 없습니다. 같은 Windows 계정으로 로그인한 화면에서는 보호하지 못하니 자리를 비울 때 화면을
          잠그세요.
        </p>
        <p className="security-state" role="status" aria-atomic="true">
          {!status
            ? "상태 확인 중…"
            : status.state === "on"
              ? `켜짐 — 자료·마지막 정상본·보호본을 암호화해 저장합니다.${status.test ? " (시험용 보호기)" : ""}`
              : status.state === "unavailable"
                ? `사용할 수 없음 — ${status.reason}. 암호화하지 않은 채 지금처럼 저장합니다.`
                : `꺼짐 — 자료를 암호화하지 않고 저장합니다.${status.reason ? ` (${status.reason})` : ""}`}
        </p>
        {done && <p className="list-count">{done}</p>}
        {status?.state === "on" && (
          <ul className="security-notes">
            <li>켜기 전에 만든 자동 보호본·복원 보호본·직접 만든 백업은 암호화되지 않은 채 남아 있습니다. 필요 없으면 직접 지우세요.</li>
            <li>백업은 그때마다 정하는 백업 암호로 따로 잠겨, 다른 PC에서도 그 암호로 복원할 수 있습니다.</li>
            <li>브리핑·양식·보고서로 내보낸 파일은 사람이 읽는 파일이라 암호화하지 않습니다.</li>
          </ul>
        )}
        {readOnly && status?.state === "off" && (
          <p className="error" role="note">
            읽기 전용 자료라 지금은 암호화를 켤 수 없습니다.
          </p>
        )}
        {status?.state === "off" && !recoveryKey && (
          <div className="import-actions">
            <button type="button" className="primary" disabled={busy || readOnly} onClick={prepare}>
              복구 키 만들기
            </button>
            <span className="muted">복구 키를 적고 다시 입력해야 켜집니다.</span>
          </div>
        )}
        {recoveryKey && (
          <form className="recovery-key" onSubmit={enable}>
            <h3 className="holiday-list-title">복구 키</h3>
            <p className="recovery-key-value" aria-label="복구 키">
              <code>{recoveryKey}</code>
            </p>
            <ul className="security-notes">
              {RECOVERY_RULES.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
            <Field label="복구 키 다시 입력" hint="적은 종이를 보고 24자를 입력하세요. 대소문자·띄어쓰기는 상관없습니다.">
              <input
                value={typed}
                autoComplete="off"
                spellCheck={false}
                maxLength={60}
                disabled={busy}
                onChange={(e) => setTyped(e.target.value)}
              />
            </Field>
            <div className="import-actions">
              <button type="submit" className="primary" disabled={busy || !typed.trim()}>
                확인하고 암호화 켜기
              </button>
              <button type="button" disabled={busy} onClick={close}>
                취소
              </button>
            </div>
          </form>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  );
}

type UnlockInfo = Awaited<ReturnType<NonNullable<typeof window.workdesk>["unlockInfo"]>>;
/**
 * Shown in its own window at startup, before any data is read: the recovery key when this
 * PC cannot open the data key (TASK-SECURITY-02), or the password of a password backup picked
 * in the startup recovery flow (TASK-SECURITY-03).
 */
export function UnlockScreen() {
  const api = window.workdesk;
  const [info, setInfo] = useState<UnlockInfo>();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    api
      ?.unlockInfo()
      .then(setInfo)
      .catch(() => setInfo({ kind: "recovery", reason: "" }));
  }, [api]);
  const backup = info?.kind === "backup";
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!api) return;
    setBusy(true);
    setError("");
    try {
      await api.unlockTry(typed);
      setOpened(true);
    } catch (e) {
      setError(ipcMessage(e, backup ? "백업 암호로 열지 못했습니다." : "복구 키로 열지 못했습니다."));
      setBusy(false);
    }
  }
  if (!info) return null;
  return (
    <main className="unlock-screen">
      <form className="panel unlock-panel" onSubmit={submit} aria-labelledby="unlock-title">
        <h1 id="unlock-title">{backup ? "암호 백업 열기" : "암호화된 업무 자료 열기"}</h1>
        {info.kind === "backup" ? (
          <p>
            {info.name}은(는) 백업 암호로 잠겨 있습니다. 백업할 때 정한 암호를 입력하세요. 틀리면 아무것도 바뀌지 않으며 다시 입력할
            수 있습니다.
          </p>
        ) : (
          <>
            <p>{info.reason || "이 PC에서 암호화 키를 열지 못했습니다."}</p>
            <p className="muted">
              저장 암호화를 켤 때 종이에 적은 복구 키(4자리씩 6묶음)를 입력하세요. 열기 전에는 업무 자료를 읽거나 바꾸지 않습니다.
            </p>
          </>
        )}
        <Field label={backup ? "백업 암호" : "복구 키"} hint={backup ? undefined : "대소문자·띄어쓰기는 상관없습니다."}>
          <input
            type={backup ? "password" : "text"}
            value={typed}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            maxLength={backup ? 256 : 60}
            disabled={busy || opened}
            onChange={(e) => setTyped(e.target.value)}
          />
        </Field>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {opened && <p role="status">열었습니다. 업무 화면을 준비하는 중입니다…</p>}
        <div className="import-actions">
          <button type="submit" className="primary" disabled={busy || opened || !typed.trim()}>
            열기
          </button>
          {/* 취소 returns to the startup recovery choices; 종료 ends the app. */}
          <button type="button" disabled={busy || opened} onClick={() => void api?.unlockQuit()}>
            {backup ? "취소" : "종료"}
          </button>
        </div>
      </form>
    </main>
  );
}
