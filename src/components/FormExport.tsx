import { useMemo, useState } from "react";
import { buildForm, FORMS, type FormFormat, type FormId } from "../../shared/forms.mjs";
import { dayKey } from "../../shared/model.mjs";
import { periodRange } from "../../shared/dates.mjs";
import type { Data } from "../types";
import { Field } from "../ui";
import { Sheet } from "./Sheet";

const thisWeek = () => periodRange("week", dayKey());

/** Recommended forms (TASK-FORMS-01): preview here, the main process writes the file. */
export function FormExport({ data, busy, onClose }: { data: Data; busy: boolean; onClose: () => void }) {
  const [form, setForm] = useState<FormId>("patrol-log");
  const [range, setRange] = useState(thisWeek);
  const [format, setFormat] = useState<FormFormat>("txt");
  const [status, setStatus] = useState("");
  const preview = useMemo(() => {
    try {
      return { text: buildForm(data, { form, ...range, format: "txt" }).content, error: "" };
    } catch (error) {
      return { text: "", error: error instanceof Error ? error.message : "출력 조건을 확인하세요." };
    }
  }, [data, form, range]);
  const api = window.workdesk;
  async function saveFile() {
    setStatus("");
    try {
      if (await api?.exportForm({ form, ...range, format }))
        setStatus(`${FORMS[form]}을(를) ${format.toUpperCase()} 파일로 저장했습니다.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "파일을 저장하지 못했습니다.");
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(preview.text);
      setStatus("미리보기 내용을 복사했습니다. 다른 문서에 붙여 넣을 수 있습니다.");
    } catch {
      setStatus("복사하지 못했습니다. 파일로 저장해 주세요.");
    }
  }
  return (
    <Sheet title="양식 출력" busy={busy} onClose={onClose} className="form-export" closeButton={false}>
      <div className="editor">
        <div className="editor-header-actions">
          <button className="primary" disabled={busy || !api || !!preview.error} onClick={saveFile}>
            파일로 저장
          </button>
          <button disabled={!!preview.error} onClick={copy}>
            미리보기 복사
          </button>
          <button type="button" onClick={onClose}>
            닫기
          </button>
        </div>
        <p className="editor-intro">
          추천 양식입니다(공식 서식 아님). 이미 남긴 순찰·단속 기록으로 만들며 다시 입력하지 않습니다.
        </p>
        <Field label="양식">
          <select value={form} onChange={(e) => setForm(e.target.value as FormId)}>
            {Object.entries(FORMS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <div className="form-row">
          <Field label="시작일">
            <input
              type="date"
              value={range.startDate}
              onChange={(e) => e.target.value && setRange({ ...range, startDate: e.target.value })}
            />
          </Field>
          <Field label="종료일">
            <input
              type="date"
              value={range.endDate}
              onChange={(e) => e.target.value && setRange({ ...range, endDate: e.target.value })}
            />
          </Field>
        </div>
        <fieldset className="format-choice">
          <legend>파일 형식</legend>
          {(
            [
              ["txt", "TXT · 읽기·붙여 넣기"],
              ["csv", "CSV · 엑셀 편집"],
            ] as const
          ).map(([value, label]) => (
            <label key={value}>
              <input type="radio" name="form-format" checked={format === value} onChange={() => setFormat(value)} />
              {label}
            </label>
          ))}
        </fieldset>
        {preview.error ? (
          <p role="alert" className="notice error">
            {preview.error}
          </p>
        ) : (
          <pre className="form-preview" aria-label="양식 미리보기">
            {preview.text}
          </pre>
        )}
        {status && (
          <p className="help" role="status">
            {status}
          </p>
        )}
      </div>
    </Sheet>
  );
}
