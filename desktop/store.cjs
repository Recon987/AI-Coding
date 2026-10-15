const fs = require("node:fs");
const path = require("node:path");
const { empty, normalize } = require("../shared/model.mjs");
const MAX_BYTES = 20 * 1024 * 1024;
function read(file) {
  if (!fs.existsSync(file)) return empty();
  if (fs.statSync(file).size > MAX_BYTES)
    throw new Error("데이터 파일이 20MB를 초과했습니다.");
  return normalize(JSON.parse(fs.readFileSync(file, "utf8")));
}
function write(file, data) {
  const validated = normalize(data);
  const payload = JSON.stringify(validated, null, 2);
  if (Buffer.byteLength(payload) > MAX_BYTES)
    throw new Error(
      "저장 한도 20MB를 초과했습니다. 백업 후 기록을 정리하세요.",
    );
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = file + ".tmp";
  try {
    fs.writeFileSync(temporary, payload, { mode: 0o600 });
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}
function migrateFile(file) {
  if (!fs.existsSync(file)) return;
  const original = JSON.parse(fs.readFileSync(file, "utf8"));
  normalize(original);
  if ([1, 2].includes(original.version)) {
    // Byte-for-byte original, never replace a prior migration backup.
    const backup = file + `.v${original.version}-backup.json`;
    if (!fs.existsSync(backup))
      fs.copyFileSync(file, backup, fs.constants.COPYFILE_EXCL);
    write(file, original);
  }
}
function due(events, now, seen) {
  return events.filter(
    (e) =>
      !e.done &&
      !seen.has(e.id + e.at) &&
      Date.parse(e.at) <= now &&
      Date.parse(e.at) > now - 60000,
  );
}
module.exports = { empty, validate: normalize, read, write, migrateFile, due };
