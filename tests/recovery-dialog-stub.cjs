// Test-only: loaded with Electron's -r option into the development main process so
// the startup recovery dialog (shown before any window exists) can be answered.
const { dialog } = require("electron");
const answer = process.env.PARK_TEST_RECOVERY_ANSWER;
const log = process.env.PARK_TEST_RECOVERY_LOG;
const fs = require("node:fs");
dialog.showMessageBox = async (...args) => {
  const options = args.find((a) => a && Array.isArray(a.buttons));
  if (log) fs.appendFileSync(log, JSON.stringify({ buttons: options.buttons, detail: options.detail }) + "\n");
  return { response: Math.max(0, options.buttons.indexOf(answer)) };
};
