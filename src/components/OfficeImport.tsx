import { useEffect, useState } from "react";
import type { Data, Save } from "../types";
import {
  importColumns,
  previewOfficeImport,
  type ImportKind,
  type ImportPreview,
} from "../../shared/office-import.mjs";
import { Field, SectionHead } from "../ui";
import { Icon } from "./Icon";
const labels: Record<ImportKind, string> = {
  organizations: "조직",
  employees: "직원",
  bases: "거점",
  assignments: "근무표",
};
const examples: Record<ImportKind, string> = {
  organizations: "PARK,시험 사무소,",
  employees: "E001,시험 직원,PARK,담당,true",
  bases: "B01,시험 거점,PARK",
  assignments: "E001,2026-10-15,base,night,B01,교대 인계",
};
export function OfficeImport({
  data,
  save,
  busy,
}: {
  data: Data;
  save: Save;
  busy: boolean;
}) {
  const [kind, setKind] = useState<ImportKind>("organizations"),
    [source, setSource] = useState(""),
    [preview, setPreview] = useState<ImportPreview | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  useEffect(() => {
    setPreview(null);
  }, [data]);
  const template = importColumns[kind].join(",") + "\n" + examples[kind];
  const update = (value: string) => {
    setSource(value);
    setPreview(null);
    setError("");
    setMessage("");
  };
  return (
    <div className="import-workspace">
      <section className="panel">
        <SectionHead title="파일 반입">
          <span className="muted">UTF-8 CSV · 최대 2MB / 10,000행</span>
        </SectionHead>
        <p className="editor-intro">
          ERP에서 내려받은 자료를 아래 표준 열로 정리해 반입합니다. 같은 코드는
          기존 항목을 갱신하고, 새 코드는 추가합니다. 파일에 없는 기존 항목은
          유지합니다.
        </p>
        <div className="form-row">
          <Field label="반입 종류">
            <select
              value={kind}
              disabled={busy}
              onChange={(e) => {
                setKind(e.target.value as ImportKind);
                update("");
              }}
            >
              {Object.entries(labels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="CSV 파일">
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={busy}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setPreview(null);
                setMessage("");
                try {
                  if (file.size > 2 * 1024 * 1024)
                    throw new Error("2MB 이하의 CSV 파일을 선택하세요.");
                  update(
                    new TextDecoder("utf-8", { fatal: true }).decode(
                      await file.arrayBuffer(),
                    ),
                  );
                } catch (cause) {
                  setSource("");
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : "UTF-8 CSV로 저장한 파일을 선택하세요.",
                  );
                }
              }}
            />
          </Field>
        </div>
        <Field label="반입 CSV">
          <textarea
            rows={9}
            value={source}
            maxLength={2 * 1024 * 1024}
            onChange={(e) => update(e.target.value)}
            placeholder="CSV 파일을 선택하거나 머리글을 포함한 내용을 붙여넣으세요."
            spellCheck={false}
          />
        </Field>
        <div className="import-actions">
          <button
            className="primary"
            disabled={busy || !source.trim()}
            onClick={() => {
              setMessage("");
              try {
                setPreview(previewOfficeImport(data, kind, source));
                setError("");
              } catch (cause) {
                setPreview(null);
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "반입 형식을 확인하세요.",
                );
              }
            }}
          >
            <Icon name="search" size={16} />
            반입 미리보기
          </button>
          <span className="muted">
            미리보기만으로는 자료가 변경되지 않습니다.
          </span>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
        {preview && (
          <section className="import-preview">
            <SectionHead
              title={`추가 ${preview.added} · 수정 ${preview.updated} · 유지 ${preview.unchanged}건`}
            >
              <button
                className="primary"
                disabled={busy}
                onClick={async () => {
                  if (preview && (await save(preview.data))) {
                    setMessage(
                      `${labels[kind]} ${preview.changes.length}건을 확인하고 반입했습니다.`,
                    );
                    setPreview(null);
                    setSource("");
                  }
                }}
              >
                확인 후 반입 적용
              </button>
            </SectionHead>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>행</th>
                    <th>항목</th>
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
            {preview.changes.length > 50 && (
              <p className="help">
                처음 50행 표시 · 적용 대상 {preview.changes.length}행
              </p>
            )}
          </section>
        )}
      </section>
      <aside className="panel import-guide">
        <SectionHead title="반입 순서와 양식" />
        <ol>
          <li>조직 (상위 조직 포함)</li>
          <li>직원과 거점</li>
          <li>날짜별 근무표</li>
        </ol>
        <h3>{labels[kind]} CSV 예시</h3>
        <pre>{template}</pre>
        <p>
          열 순서는 바꿀 수 있지만 머리글 이름은 일치해야 합니다. 선택 값은 빈
          칸으로 두고 열은 유지하세요.
        </p>
        <p>
          근무 구분: work(사무소 근무), off(휴무), leave(연가), trip(출장),
          base(거점근무). 당직 구분: none(없음), day(주간당직), night(숙직).
          한글 구분명도 지원합니다.
        </p>
        <p>
          근무표는 직원번호+날짜로 갱신합니다. 거점근무에는 baseCode가
          필요합니다. active는 true 또는 false입니다.
        </p>
        <p>
          기관 ERP의 실제 열 구성은 확인 후 매핑합니다. 이 화면은 ERP에 접속하지
          않습니다.
        </p>
      </aside>
    </div>
  );
}
