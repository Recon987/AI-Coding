// TASK-SECURITY-03: backup password rules, shared by the backup sheet and the main process.
// The password is never stored; these rules only decide whether it may be used.
export const MIN_PASSWORD = 10;
export const MAX_PASSWORD = 256;

/** Why this password cannot be used, or "" when it can. */
export function passwordProblem(password) {
  if (typeof password !== "string" || !password) return "백업 암호를 입력하세요.";
  const chars = [...password];
  if (chars.length < MIN_PASSWORD) return `백업 암호는 ${MIN_PASSWORD}자 이상으로 정하세요.`;
  if (chars.length > MAX_PASSWORD) return `백업 암호는 ${MAX_PASSWORD}자 이하로 정하세요.`;
  if (new Set(chars).size < 4) return "같은 글자를 되풀이한 암호는 쓸 수 없습니다.";
  return "";
}

/** A rough strength hint for the sheet: length and kinds of characters, nothing more. */
export function passwordStrength(password) {
  if (passwordProblem(password)) return "사용 불가";
  const kinds = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((re) => re.test(password)).length;
  const length = [...password].length;
  if (length >= 16 && kinds >= 2) return "강함";
  if (length >= 12 || kinds >= 3) return "보통";
  return "약함";
}
