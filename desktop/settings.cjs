const fs = require("node:fs");
const path = require("node:path");

const defaults = () => ({ version: 1, closeToTray: false });
function validateSettings(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    value.version !== 1 ||
    typeof value.closeToTray !== "boolean" ||
    Object.keys(value).some((key) => !["version", "closeToTray"].includes(key))
  )
    throw new Error("PC 설정 형식을 확인하세요.");
  return { version: 1, closeToTray: value.closeToTray };
}
function atomicWrite(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = file + ".tmp";
  try {
    fs.writeFileSync(temporary, JSON.stringify(value, null, 2), {
      mode: 0o600,
    });
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}
function readSettings(file) {
  if (!fs.existsSync(file)) return defaults();
  if (fs.statSync(file).size > 4096)
    throw new Error("PC 설정 파일이 너무 큽니다.");
  return validateSettings(JSON.parse(fs.readFileSync(file, "utf8")));
}
function loadSettings(file) {
  try {
    return { settings: readSettings(file), message: "" };
  } catch {
    return {
      settings: defaults(),
      message:
        "PC 설정을 읽지 못해 창 닫기 시 종료하도록 시작했습니다. 기존 설정 파일은 보존됩니다.",
    };
  }
}
function writeSettings(file, value) {
  const validated = validateSettings(value);
  if (fs.existsSync(file)) {
    try {
      readSettings(file);
    } catch {
      // Preserve a damaged file before an explicit user change replaces it.
      const backup = file + ".invalid-backup.json";
      if (!fs.existsSync(backup))
        fs.copyFileSync(file, backup, fs.constants.COPYFILE_EXCL);
    }
  }
  atomicWrite(file, validated);
  return validated;
}
module.exports = {
  defaults,
  validateSettings,
  readSettings,
  loadSettings,
  writeSettings,
  atomicWrite,
};
