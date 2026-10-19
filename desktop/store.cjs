const fs = require("node:fs");
const path = require("node:path");
const { empty, normalize, isNewerData } = require("../shared/model.mjs");
const MAX_BYTES = 20 * 1024 * 1024;
// Antivirus, indexing or sync tools on Windows can hold a file for a moment.
const TRANSIENT = new Set(["EPERM", "EBUSY", "EACCES"]);
const isTransientLock = (error) => TRANSIENT.has(error?.code);
const RETRY_MS = [50, 100, 200, 400];
// Replaceable so tests do not sleep; a synchronous wait keeps write() synchronous.
const retry = {
  wait: (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms),
};
function withRetry(action) {
  for (let attempt = 0; ; attempt++) {
    try {
      return action();
    } catch (error) {
      if (!isTransientLock(error) || attempt >= RETRY_MS.length) throw error;
      retry.wait(RETRY_MS[attempt]);
    }
  }
}
// allowNewer: only for showing a newer app's file read-only; write() never accepts it.
function read(file, { required = false, allowNewer = false } = {}) {
  let stat;
  try { stat = fs.statSync(file); }
  catch (error) {
    if (!required && error.code === "ENOENT") return empty();
    throw error;
  }
  if (!stat.isFile()) throw new Error("정상 JSON 파일을 선택하세요.");
  if (stat.size > MAX_BYTES) throw new Error("데이터 파일이 20MB를 초과했습니다.");
  const bytes = withRetry(() => fs.readFileSync(file));
  if (bytes.length > MAX_BYTES) throw new Error("데이터 파일이 20MB를 초과했습니다.");
  return normalize(JSON.parse(bytes.toString("utf8")), { allowNewer });
}
// Write, flush to disk, then rename so a power loss leaves either the old or the new file.
function durableReplace(file, payload) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = file + ".tmp";
  try {
    const fd = withRetry(() => fs.openSync(temporary, "w", 0o600));
    try {
      const bytes = Buffer.from(payload, "utf8");
      for (let offset = 0; offset < bytes.length; )
        offset += fs.writeSync(fd, bytes, offset, bytes.length - offset);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    withRetry(() => fs.renameSync(temporary, file));
  } finally {
    // Cleanup must not replace the original error.
    try { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); } catch {}
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
  // A newer app's v3 file is never converted here; read-only handling is in recovery.cjs.
  normalize(original, { allowNewer: true });
  if ([1, 2].includes(original.version)) {
    // Byte-for-byte original, never replace a prior migration backup.
    // A later v1/v2 file gets its own copy instead of reusing an older backup name.
    let backup = file + `.v${original.version}-backup.json`;
    for (let n = 2; fs.existsSync(backup); n++)
      backup = file + `.v${original.version}-backup-${n}.json`;
    fs.copyFileSync(file, backup, fs.constants.COPYFILE_EXCL);
    return write(file, original, { keepLastGood: true });
  }
}
// Copies made before each restore (TASK-BACKUP-02). Only "<file>.before-restore-<ms>.json"
// counts; v1/v2 conversion backups, corrupt copies and .last-good are never touched.
const RESTORE_KEEP = 5;
function restoreCopies(file) {
  const dir = path.dirname(file);
  const prefix = path.basename(file) + ".before-restore-";
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  return names
    .filter((name) => name.startsWith(prefix) && /^\d+\.json$/.test(name.slice(prefix.length)))
    .map((name) => ({ file: path.join(dir, name), at: Number(name.slice(prefix.length, -5)) }))
    .sort((a, b) => a.at - b.at);
}
/**
 * A new, unused protection-copy path for a restore at `now`. The number is never below
 * an existing copy's, so the new copy always sorts newest even after the PC clock was
 * once set ahead (BK-01, Codex review 2026-10-19).
 */
function restoreCopyPath(file, now = Date.now(), existing = restoreCopies(file)) {
  let at = Math.max(now, ...existing.map((c) => c.at + 1));
  while (fs.existsSync(`${file}.before-restore-${at}.json`)) at++;
  return `${file}.before-restore-${at}.json`;
}
/** The copies a prune would delete: the oldest beyond `keep`, never one listed in `protect`. */
function restoreCopiesToPrune(copies, keep = RESTORE_KEEP, protect = []) {
  const kept = copies.filter((c) => protect.includes(c.file));
  const others = copies.filter((c) => !protect.includes(c.file));
  return others.slice(0, Math.max(0, others.length - Math.max(0, keep - kept.length)));
}
/**
 * Deletes the oldest restore copies beyond `keep`, never the files in `protect` (the copy
 * just made). A file that cannot be deleted is reported, not thrown.
 */
function pruneRestoreCopies(file, keep = RESTORE_KEEP, protect = []) {
  const removed = [];
  const failed = [];
  for (const copy of restoreCopiesToPrune(restoreCopies(file), keep, protect)) {
    try {
      withRetry(() => fs.unlinkSync(copy.file));
      removed.push(copy);
    } catch {
      failed.push(copy);
    }
  }
  return { removed, failed };
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
  isNewerData,
  read,
  write,
  migrateFile,
  lastGoodFile,
  RESTORE_KEEP,
  restoreCopies,
  restoreCopyPath,
  restoreCopiesToPrune,
  pruneRestoreCopies,
  isTransientLock,
  retry,
  due,
};
