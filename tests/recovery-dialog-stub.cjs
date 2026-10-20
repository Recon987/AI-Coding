// Test-only: loaded with Electron's -r option into the development main process so
// the startup recovery dialog (shown before any window exists) can be answered.
// PARK_TEST_RECOVERY_ANSWERS (JSON list) answers in order, then PARK_TEST_RECOVERY_ANSWER;
// PARK_TEST_RECOVERY_PICK is the file "picked" in the open dialog (TASK-SECURITY-03).
const { dialog } = require("electron");
const answer = process.env.PARK_TEST_RECOVERY_ANSWER;
const answers = JSON.parse(process.env.PARK_TEST_RECOVERY_ANSWERS || "[]");
const pick = process.env.PARK_TEST_RECOVERY_PICK;
const log = process.env.PARK_TEST_RECOVERY_LOG;
const fs = require("node:fs");
dialog.showMessageBox = async (...args) => {
  const options = args.find((a) => a && Array.isArray(a.buttons));
  if (log) fs.appendFileSync(log, JSON.stringify({ buttons: options.buttons, detail: options.detail }) + "\n");
  const label = answers.length ? answers.shift() : answer;
  return { response: Math.max(0, options.buttons.indexOf(label)) };
};
if (pick) dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [pick] });
