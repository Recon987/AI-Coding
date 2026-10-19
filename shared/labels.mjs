// Button and editor wording in one place (TASK-LABELS-01 U6). Decided 2026-10-19:
// new records use "등록" (the word most screens already used), editors are titled
// "<대상> 등록" / "<대상> 수정", and the submit button is always "저장".
// Tests read these constants, so a wording change is a one-line edit here.
export const TARGET = {
  patrol: "순찰 기록",
  event: "일정",
  control: "통제",
  handover: "인수인계",
  submission: "제출 기한",
  note: "메모",
  call: "전화메모",
  assignment: "근무",
};
export const SAVE = "저장";
/** "<대상> 등록" for list buttons and new-record editors. */
export const addLabel = (target) => `${target} 등록`;
/** "<대상> 수정" for editors of an existing record. */
export const editLabel = (target) => `${target} 수정`;
/** Editor title for a draft: 수정 when it already has an id. */
export const editorTitle = (target, existing) => (existing ? editLabel(target) : addLabel(target));
