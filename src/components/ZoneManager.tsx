import { useEffect, useState } from "react";
import type { ImportPreview } from "../../shared/office-import.mjs";
import { ZONE_COLUMNS, previewZoneImport } from "../../shared/zones-import.mjs";
import { askConfirm } from "../confirm";
import type { Data } from "../types";
import { Field } from "../ui";
import { Sheet } from "./Sheet";

const EXAMPLE = `${ZONE_COLUMNS.join(",")}\n3-1,가상 계곡 구역,계곡안내소 → 쉼터,true\n3-2,가상 능선 구역,,`;

/**
 * 담당구역 번호 목록 (TASK-LOCATION-01): loaded from a local CSV (file or paste) with a
 * preview first, like the office import. Patrol records keep their own zone text, so
 * deleting or changing a zone here never edits a patrol.
 */
export function ZoneManager({
  data,
  busy,
  readOnly,
  save,
  onClose,
}: {
  data: Data;
  busy: boolean;
  readOnly: boolean;
  save: (next: Data) => Promise<boolean>;
  onClose: () => void;
}) {
  const [source, setSource] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  // A preview made on older data must not be applied over newer data.
  useEffect(() => setPreview(null), [data]);
  const zones = [...data.zones].sort((a, b) => a.code.localeCompare(b.code, "ko", { numeric: true }));
  const locked = busy || readOnly;
  const update = (value: string) => {
    setSource(value);
    setPreview(null);
    setError("");
  };
  function check() {
    setStatus("");
    try {
      setPreview(previewZoneImport(data, source));
      setError("");
    } catch (cause) {
      setPreview(null);
      setError(cause instanceof Error ? cause.message : "반입 형식을 확인하세요.");
    }
  }
  async function apply() {
    if (!preview) return;
    const count = preview.changes.length;
    if (await save(preview.data)) {
      setStatus(`담당구역 ${count}건을 확인하고 반입했습니다(추가 ${preview.added} · 수정 ${preview.updated} · 유지 ${preview.unchanged}).`);
      setPreview(null);
      setSource("");
    }
  }
  async function remove(id: string, label: string) {
    if (
      !(await askConfirm({
        message: `${label}을(를) 목록에서 지울까요?`,
        detail: "이 번호로 적은 순찰 기록은 그대로 남습니다.",
        confirmLabel: "삭제",
        danger: true,
      }))
    )
      return;
    if (await save({ ...data, zones: data.zones.filter((z) => z.id !== id) })) setStatus(`${label}을(를) 지웠습니다.`);
  }
  return (
    <Sheet title="담당구역 목록" busy={busy} onClose={onClose} size="md" className="zone-manager">
      <div className="editor">
        <p className="editor-intro">
          순찰 입력에서 고를 담당구역 번호와 대표 순찰 구간을 CSV로 반입합니다. 같은 번호는 갱신하고, 새 번호는 추가하며, 파일에 없는
          기존 구역은 그대로 둡니다. 순찰 기록에는 번호를 직접 적을 수도 있습니다. 이 PC의 자료에만 저장됩니다.
        </p>
        {readOnly && (
          <p className="error" role="note">
            읽기 전용 자료라 목록을 바꿀 수 없습니다.
          </p>
        )}
        <div className="form-row">
          <Field label="CSV 파일" hint="UTF-8 CSV · 최대 2MB / 10,000행">
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={locked}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                // LOC-01: a new file choice voids the old preview at once, so a rejected or
                // still-loading file can never leave the previous file's "적용" button behind.
                setPreview(null);
                setError("");
                setStatus("");
                try {
                  if (file.size > 2 * 1024 * 1024) throw new Error("2MB 이하의 CSV 파일을 선택하세요.");
                  update(new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer()));
                } catch (cause) {
                  setSource("");
                  setPreview(null);
                  setError(cause instanceof Error && cause.message.includes("2MB") ? cause.message : "UTF-8 CSV로 저장한 파일을 선택하세요.");
                }
              }}
            />
          </Field>
        </div>
        <Field label="반입 CSV" hint={<>머리글: {ZONE_COLUMNS.join(",")} — active는 true·false(비우면 true). 예시는 아래 참고</>}>
          <textarea
            rows={6}
            value={source}
            disabled={locked}
            maxLength={2 * 1024 * 1024}
            spellCheck={false}
            placeholder="CSV 파일을 고르거나 머리글을 포함한 내용을 붙여 넣으세요."
            onChange={(e) => update(e.target.value)}
          />
        </Field>
        <details className="zone-example">
          <summary>CSV 예시</summary>
          <pre>{EXAMPLE}</pre>
        </details>
        <div className="import-actions">
          <button type="button" disabled={locked || !source.trim()} onClick={check}>
            반입 미리보기
          </button>
          <span className="muted">미리보기만으로는 자료가 바뀌지 않습니다.</span>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {preview && (
          <section className="import-preview" aria-label="반입 미리보기">
            <div className="import-actions">
              <strong>
                추가 {preview.added} · 수정 {preview.updated} · 유지 {preview.unchanged}건
              </strong>
              <button type="button" className="primary" disabled={locked} onClick={apply}>
                확인 후 반입 적용
              </button>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>행</th>
                    <th>구역</th>
                    <th>변경</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.changes.slice(0, 50).map((row) => (
                    <tr key={row.line}>
                      <td>{row.line}</td>
                      <td>{row.label}</td>
                      <td>{row.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.changes.length > 50 && <p className="help">처음 50행 표시 · 적용 대상 {preview.changes.length}행</p>}
          </section>
        )}
        <p className="list-count" role="status" aria-atomic="true">
          {status}
        </p>
        <h3 className="holiday-list-title">등록한 담당구역 {zones.length}개</h3>
        {zones.length ? (
          <div className="table-scroll">
            <table className="zone-table">
              <thead>
                <tr>
                  <th>번호</th>
                  <th>이름</th>
                  <th>대표 순찰 구간</th>
                  <th>사용</th>
                  <th>
                    <span className="sr-only">동작</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {zones.map((z) => (
                  <tr key={z.id}>
                    <td>{z.code}</td>
                    <td>{z.name || "—"}</td>
                    <td>{z.route || "—"}</td>
                    <td>{z.active ? "사용" : "사용 안 함"}</td>
                    <td>
                      <button
                        type="button"
                        className="text-button danger"
                        aria-disabled={locked || undefined}
                        aria-label={`삭제 · 담당구역 ${z.code}`}
                        onClick={() => !locked && remove(z.id, `담당구역 ${z.code}`)}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="compact-empty">아직 반입한 담당구역이 없습니다.</p>
        )}
      </div>
    </Sheet>
  );
}
