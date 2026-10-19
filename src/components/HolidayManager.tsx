import { useState, type FormEvent } from "react";
import { LUNAR_TABLE_YEARS, parseHolidayLines } from "../../shared/model.mjs";
import { addLabel, TARGET } from "../../shared/labels.mjs";
import { askConfirm } from "../confirm";
import type { Data } from "../types";
import { Field, formatDate } from "../ui";
import { Sheet } from "./Sheet";

/**
 * Holidays the built-in table cannot know in advance (임시공휴일, later election days),
 * typed or pasted by the user and kept only in this PC's data (TASK-HOLIDAY-01).
 */
export function HolidayManager({
  data,
  busy,
  save,
  onClose,
}: {
  data: Data;
  busy: boolean;
  save: (next: Data) => Promise<boolean>;
  onClose: () => void;
}) {
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [paste, setPaste] = useState("");
  const [status, setStatus] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const list = [...data.customHolidays].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  async function store(text: string, clear: () => void) {
    let result: ReturnType<typeof parseHolidayLines>;
    try {
      result = parseHolidayLines(text, data.customHolidays);
    } catch (error) {
      // Any other validation failure is shown too; nothing is saved and the draft stays.
      setErrors([error instanceof Error ? error.message : "등록할 수 없는 목록입니다."]);
      setStatus("등록하지 않았습니다. 아래 내용을 확인하세요.");
      return;
    }
    setErrors(result.errors);
    if (result.errors.length) {
      setStatus("등록하지 않았습니다. 아래 줄을 고친 뒤 다시 시도하세요.");
      return;
    }
    if (!result.rows.length) {
      setStatus(
        result.skipped
          ? `이미 있는 날짜 ${result.skipped}개는 건너뛰었습니다.`
          : "등록할 날짜가 없습니다.",
      );
      return;
    }
    if (
      await save({
        ...data,
        customHolidays: [...data.customHolidays, ...result.rows],
      })
    ) {
      clear();
      setStatus(
        `공휴일 ${result.rows.length}개를 등록했습니다.${result.skipped ? ` 이미 있는 날짜 ${result.skipped}개는 건너뛰었습니다.` : ""}`,
      );
    }
  }
  async function addOne(event: FormEvent) {
    event.preventDefault();
    await store(`${date},${name.trim()}`, () => {
      setDate("");
      setName("");
    });
  }
  async function remove(id: string, label: string) {
    if (
      !(await askConfirm({
        message: `${label}을(를) 공휴일에서 지울까요?`,
        confirmLabel: "삭제",
        danger: true,
      }))
    )
      return;
    if (
      await save({
        ...data,
        customHolidays: data.customHolidays.filter((h) => h.id !== id),
      })
    )
      setStatus(`${label}을(를) 지웠습니다.`);
  }
  return (
    <Sheet
      title="공휴일 관리"
      busy={busy}
      onClose={onClose}
      size="sm"
      className="holiday-manager"
    >
      <div className="editor">
        <p className="editor-intro">
          기본 표에는 법정 공휴일과 확정된 선거일이 들어 있습니다.
          임시공휴일처럼 미리 알 수 없는 날은 여기에서 등록합니다. 이 PC의
          자료에만 저장되고 인터넷에서 가져오지 않습니다. 음력
          공휴일(설·추석·부처님오신날)은
          {` ${LUNAR_TABLE_YEARS.first}~${LUNAR_TABLE_YEARS.last}년`}만 들어
          있습니다.
        </p>
        <form className="holiday-add" onSubmit={addOne}>
          <Field label="날짜">
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field label="이름">
            <input
              required
              maxLength={30}
              value={name}
              placeholder="예: 임시공휴일"
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <button className="primary" disabled={busy}>
            {addLabel(TARGET.holiday)}
          </button>
        </form>
        <details className="holiday-paste">
          <summary>여러 날을 한 번에 붙여 넣기</summary>
          <Field
            label="한 줄에 하나씩"
            hint="예: 2030-06-05,지방선거일 — 쉼표나 탭으로 구분합니다. 한 줄이라도 틀리면 아무것도 등록하지 않습니다."
          >
            <textarea
              rows={4}
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
            />
          </Field>
          <button
            type="button"
            disabled={busy || !paste.trim()}
            onClick={() => store(paste, () => setPaste(""))}
          >
            붙여 넣은 목록 등록
          </button>
        </details>
        <p className="list-count" role="status" aria-atomic="true">
          {status}
        </p>
        {errors.length > 0 && (
          <ul className="field-error holiday-errors">
            {errors.slice(0, 5).map((error) => (
              <li key={error}>{error}</li>
            ))}
            {errors.length > 5 && <li>그 밖에 {errors.length - 5}줄</li>}
          </ul>
        )}
        <h3 className="holiday-list-title">등록한 공휴일 {list.length}개</h3>
        {list.length ? (
          <ul className="holiday-list">
            {list.map((h) => (
              <li key={h.id}>
                <span>
                  <time dateTime={h.date}>{formatDate(h.date)}</time> {h.name}
                </span>
                <button
                  type="button"
                  className="text-button danger"
                  disabled={busy}
                  aria-label={`삭제 · ${h.date} ${h.name}`}
                  onClick={() =>
                    remove(h.id, `${formatDate(h.date)} ${h.name}`)
                  }
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="compact-empty">아직 등록한 공휴일이 없습니다.</p>
        )}
      </div>
    </Sheet>
  );
}
