import { useState, type FormEvent } from "react";
import { MIN_PASSWORD, passwordProblem, passwordStrength } from "../../shared/backup-password.mjs";
import { Field } from "../ui";
import { ipcMessage } from "./Security";
import { Sheet } from "./Sheet";

/**
 * 백업 암호 (TASK-SECURITY-03): every backup is sealed with a password typed twice for that
 * backup, and a password backup asks for it again on restore. Nothing here is stored.
 */
export function BackupSheet({
  mode,
  name,
  busy,
  onSubmit,
  onClose,
}: {
  mode: "backup" | "restore";
  /** The picked backup file (restore). */
  name?: string;
  busy: boolean;
  /** Throws to show the reason and let the user try again. */
  onSubmit: (password: string) => Promise<void>;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState("");
  const backup = mode === "backup";
  const problem = backup ? passwordProblem(password) : "";
  const strength = backup && password ? passwordStrength(password) : "";
  const mismatch = backup && again !== "" && again !== password;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (backup && (problem || password !== again)) {
      setError(problem || "두 번 입력한 백업 암호가 다릅니다.");
      return;
    }
    setError("");
    try {
      await onSubmit(password);
    } catch (e) {
      setError(ipcMessage(e, backup ? "백업하지 못했습니다." : "복원하지 못했습니다."));
    }
  }
  return (
    <Sheet title={backup ? "암호로 백업" : "암호 백업 복원"} busy={busy} onClose={onClose} size="sm" className="backup-sheet">
      <form className="editor" onSubmit={submit}>
        {backup ? (
          <>
            <p className="editor-intro">
              백업 파일을 이 백업에만 쓰는 암호로 잠급니다. 다른 PC에서도 이 암호로 복원할 수 있고, USB를 잃어버려도 암호 없이는
              내용을 읽을 수 없습니다.
            </p>
            <ul className="security-notes">
              <li>암호는 앱에 저장하지 않습니다. 잊으면 이 백업은 아무도 열 수 없습니다.</li>
              <li>암호를 백업 파일과 같은 USB·폴더·메신저에 적어 두지 마세요. 전달해야 하면 다른 길(전화·종이)로 알리세요.</li>
              <li>여러 단어를 이은 긴 문장이 외우기 쉽고 강합니다.</li>
            </ul>
          </>
        ) : (
          <p className="editor-intro">
            {name ? `${name}은(는) ` : "선택한 백업은 "}백업 암호로 잠겨 있습니다. 백업할 때 정한 암호를 입력하세요. 암호가 틀리면
            아무것도 바뀌지 않으며 다시 입력할 수 있습니다.
          </p>
        )}
        <Field
          label="백업 암호"
          hint={backup ? `${MIN_PASSWORD}자 이상${strength ? ` · 강도: ${strength}` : ""}` : undefined}
        >
          <input
            type="password"
            value={password}
            autoComplete="off"
            maxLength={256}
            disabled={busy}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {backup && (
          <Field label="백업 암호 다시 입력" error={mismatch ? "두 번 입력한 백업 암호가 다릅니다." : undefined}>
            <input
              type="password"
              value={again}
              autoComplete="off"
              maxLength={256}
              disabled={busy}
              onChange={(e) => setAgain(e.target.value)}
            />
          </Field>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="import-actions">
          <button
            type="submit"
            className="primary"
            disabled={busy || !password || (backup && (Boolean(problem) || password !== again))}
          >
            {backup ? "암호로 백업 저장" : "암호 확인 후 복원"}
          </button>
          <button type="button" disabled={busy} onClick={onClose}>
            취소
          </button>
        </div>
      </form>
    </Sheet>
  );
}
