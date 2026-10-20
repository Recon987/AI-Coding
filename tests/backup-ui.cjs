// TASK-SECURITY-03: the real backup/restore password steps, shared by the desktop smokes.
// Backups are sealed with a password typed twice; a password backup asks for it on restore.
const fs = require("node:fs");

const TEST_PASSWORD = "가상 시험용 백업 암호 2026";

/** After 자료 관리 > 백업 is clicked: type the password twice, save, wait for the file. */
async function fillBackupPassword(page, file, password = TEST_PASSWORD) {
  const sheet = page.getByRole("dialog", { name: "암호로 백업" });
  await sheet.waitFor();
  await sheet.getByLabel("백업 암호", { exact: true }).fill(password);
  await sheet.getByLabel("백업 암호 다시 입력", { exact: true }).fill(password);
  await sheet.getByRole("button", { name: "암호로 백업 저장", exact: true }).click();
  await sheet.waitFor({ state: "hidden", timeout: 15000 });
  for (let n = 0; !fs.existsSync(file) && n < 100; n++) await new Promise((r) => setTimeout(r, 50));
}

/** After 자료 관리 > 복원 picked a password backup: type its password and wait for the restore. */
async function fillRestorePassword(page, password = TEST_PASSWORD) {
  const sheet = page.getByRole("dialog", { name: "암호 백업 복원" });
  await sheet.waitFor();
  await sheet.getByLabel("백업 암호", { exact: true }).fill(password);
  await sheet.getByRole("button", { name: "암호 확인 후 복원", exact: true }).click();
  // scrypt takes about half a second; the sheet closes once the restore is written.
  await sheet.waitFor({ state: "hidden", timeout: 15000 });
}

module.exports = { TEST_PASSWORD, fillBackupPassword, fillRestorePassword };
