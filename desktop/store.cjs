const fs = require("node:fs");
const path = require("node:path");
const { empty, normalize } = require("../shared/model.mjs");
const MAX_BYTES = 20 * 1024 * 1024;
function read(file, { required = false } = {}) {
  let stat;
  try { stat = fs.statSync(file); }
  catch (error) {
    if (!required && error.code === "ENOENT") return empty();
    throw error;
  }
  if (!stat.isFile()) throw new Error("정상 JSON 파일을 선택하세요.");
  if (stat.size > MAX_BYTES) throw new Error("데이터 파일이 20MB를 초과했습니다.");
  const bytes = fs.readFileSync(file);
  if (bytes.length > MAX_BYTES) throw new Error("데이터 파일이 20MB를 초과했습니다.");
  return normalize(JSON.parse(bytes.toString("utf8")));
}
// Write, flush to disk, then rename so a power loss leaves either the old or the new file.
function durableReplace(file, payload) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = file + ".tmp";
  try {
    const fd = fs.openSync(temporary, "w", 0o600);
    try {
      const bytes = Buffer.from(payload, "utf8");
      for (let offset = 0; offset < bytes.length; )
        offset += fs.writeSync(fd, bytes, offset, bytes.length - offset);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
  // Persist the rename itself; directories cannot be opened for fsync on Windows.
  if (process.platform !== "win32") {
    try {
      const dir = fs.openSync(path.dirname(file), "r");
      try {
        fs.fsyncSync(dir);
      } finally {
        fs.closeSync(dir);
      }
    } catch {
      // Best effort: the data file itself is already flushed.
    }
  }
}
const lastGoodFile = (file) => file + ".last-good";
// keepLastGood: only for the live workdesk.json, never for backups or protection copies.
function write(file, data, { keepLastGood = false } = {}) {
  const validated = normalize(data);
  const payload = JSON.stringify(validated, null, 2);
  if (Buffer.byteLength(payload) > MAX_BYTES)
    throw new Error(
      "저장 한도 20MB를 초과했습니다. 백업 후 기록을 정리하세요.",
    );
  durableReplace(file, payload);
  if (keepLastGood) {
    try { durableReplace(lastGoodFile(file), payload); }
    catch {
      // The primary rename already committed. Reporting failure would leave the
      // renderer on stale data and allow its next save to overwrite this commit.
      return { warning: "자료는 저장했지만 자동 보호본을 갱신하지 못했습니다. 저장 공간과 권한을 확인하고 수동 백업을 만드세요." };
    }
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
    write(file, original, { keepLastGood: true });
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
module.exports = {
  empty,
  validate: normalize,
  read,
  write,
  migrateFile,
  lastGoodFile,
  due,
};
