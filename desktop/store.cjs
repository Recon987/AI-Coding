const fs = require("node:fs");
const path = require("node:path");
const { empty, normalize, isNewerData } = require("../shared/model.mjs");
const sealing = require("./seal.cjs");
const backupSeal = require("./backup-seal.cjs");
const MAX_BYTES = 20 * 1024 * 1024;
// TASK-SECURITY-02: the 20MB limit is on the plaintext; a sealed file is base64 (about 4/3) plus its header.
const MAX_FILE_BYTES = Math.ceil(MAX_BYTES / 3) * 4 + 64 * 1024;
// The open key ring ({ dataKey, keyId, recovery }) or null when storage encryption is off.
// While set, every write() is sealed: the main file, last-good, protection copies and backups.
let sealer = null;
function setSealer(next) {
  sealer = next ?? null;
}
const sealerActive = () => Boolean(sealer);
function codeError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}
// File bytes to the stored object, opening a sealed envelope. A plaintext file still reads
// while encryption is on (older copies, backups); it is sealed on its next write.
function parseStored(bytes) {
  const tooBig = () => new Error("데이터 파일이 20MB를 초과했습니다.");
  if (bytes.length > MAX_FILE_BYTES) throw tooBig();
  let outer;
  try {
    outer = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    // Only a sealed file may pass 20MB, so an oversize file is reported by its size.
    throw bytes.length > MAX_BYTES ? tooBig() : error;
  }
  // TASK-SECURITY-03: a password backup opens only through readBackup() with its password.
  if (backupSeal.isBackupSealed(outer))
    throw codeError("BACKUP_PASSWORD_REQUIRED", "백업 암호로 잠긴 파일입니다. 자료 관리 > 복원에서 백업 암호를 입력해 여세요.");
  if (!sealing.isSealed(outer)) {
    if (bytes.length > MAX_BYTES) throw tooBig();
    return outer;
  }
  // A future envelope this app cannot read goes to normalize(), which reports NEWER_DATA.
  if (isNewerData(outer)) return outer;
  if (!sealer) throw codeError("SEALED_LOCKED", "암호화된 자료입니다. 이 PC의 키나 복구 키로 연 뒤에 읽을 수 있습니다.");
  const inner = sealing.open(sealer, outer);
  if (inner.length > MAX_BYTES) throw tooBig();
  return JSON.parse(inner.toString("utf8"));
}
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
  if (stat.size > MAX_FILE_BYTES) throw new Error("데이터 파일이 20MB를 초과했습니다.");
  return normalize(parseStored(withRetry(() => fs.readFileSync(file))), { allowNewer });
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
// TASK-MODULES-01: the first save that adds the modular fields keeps a byte copy of the
// file as it was. Not a restore copy, so the restore-copy pruning never touches it.
const MODULAR_KEYS = ["modules", "axProjects", "axSnippets"];
const modularChecked = new Set();
function hasModularKeys(file) {
  try {
    const raw = parseStored(withRetry(() => fs.readFileSync(file)));
    return MODULAR_KEYS.some((key) => Object.hasOwn(raw, key));
  } catch {
    // An unreadable file is the recovery flow's business; back it up rather than guess.
    return false;
  }
}
function preModularBackup(file, now = Date.now()) {
  if (modularChecked.has(file)) return null;
  if (!fs.existsSync(file) || hasModularKeys(file)) {
    modularChecked.add(file);
    return null;
  }
  let target = `${file}.pre-modular-backup-${now}.json`;
  for (let at = now + 1; fs.existsSync(target); at++) target = `${file}.pre-modular-backup-${at}.json`;
  // Throws on failure, so the original is not replaced without its copy.
  withRetry(() => fs.copyFileSync(file, target, fs.constants.COPYFILE_EXCL));
  modularChecked.add(file);
  return target;
}
// keepLastGood: only for the live workdesk.json, never for backups or protection copies.
// modularBackup: only the live file gets the one-time pre-modular copy (TASK-MODULES-01).
function write(file, data, { keepLastGood = false, modularBackup = keepLastGood } = {}) {
  const validated = normalize(data);
  const payload = JSON.stringify(validated, null, 2);
  if (Buffer.byteLength(payload) > MAX_BYTES)
    throw new Error(
      "저장 한도 20MB를 초과했습니다. 백업 후 기록을 정리하세요.",
    );
  // Sealed once, so the main file and last-good hold the same bytes; .tmp only ever sees these.
  const stored = sealer ? JSON.stringify(sealing.seal(sealer, Buffer.from(payload, "utf8"))) : payload;
  if (modularBackup) preModularBackup(file);
  durableReplace(file, stored);
  if (keepLastGood) {
    try { durableReplace(lastGoodFile(file), stored); }
    catch {
      // The primary rename already committed. Reporting failure would leave the
      // renderer on stale data and allow its next save to overwrite this commit.
      return { warning: "자료는 저장했지만 자동 보호본을 갱신하지 못했습니다. 저장 공간과 권한을 확인하고 수동 백업을 만드세요." };
    }
  }
}
/**
 * TASK-SECURITY-03: a backup file for restore. A password backup needs `password`
 * (code BACKUP_PASSWORD_REQUIRED without one); a plain or this-PC sealed backup reads as before.
 */
async function readBackup(file, password) {
  const stat = fs.statSync(file);
  if (!stat.isFile()) throw new Error("정상 JSON 파일을 선택하세요.");
  if (stat.size > MAX_FILE_BYTES) throw new Error("데이터 파일이 20MB를 초과했습니다.");
  const bytes = withRetry(() => fs.readFileSync(file));
  let outer;
  try {
    outer = JSON.parse(bytes.toString("utf8"));
  } catch {
    outer = null;
  }
  if (!backupSeal.isBackupSealed(outer)) return normalize(parseStored(bytes));
  if (typeof password !== "string" || !password)
    throw codeError("BACKUP_PASSWORD_REQUIRED", "백업 암호로 잠긴 파일입니다. 백업 암호를 입력하세요.");
  const inner = await backupSeal.openBackup(outer, password);
  if (inner.length > MAX_BYTES) throw new Error("데이터 파일이 20MB를 초과했습니다.");
  let content;
  try {
    content = JSON.parse(inner.toString("utf8"));
  } catch {
    throw codeError("BACKUP_FORMAT", "암호 백업 안의 자료 형식이 올바르지 않습니다.");
  }
  // Only plain v3 data is ever sealed inside; anything nested is refused, not unwrapped.
  if (backupSeal.isBackupSealed(content) || sealing.isSealed(content))
    throw codeError("BACKUP_FORMAT", "암호 백업 안의 자료 형식이 올바르지 않습니다.");
  return normalize(content);
}
/** TASK-SECURITY-03: a backup sealed with `password`, written atomically like any data file. */
async function writeBackup(file, data, password, options) {
  const validated = normalize(data);
  const payload = JSON.stringify(validated, null, 2);
  if (Buffer.byteLength(payload) > MAX_BYTES)
    throw new Error("저장 한도 20MB를 초과했습니다. 백업 후 기록을 정리하세요.");
  const envelope = await backupSeal.sealBackup(Buffer.from(payload, "utf8"), password, options);
  durableReplace(file, JSON.stringify(envelope));
}
function migrateFile(file) {
  if (!fs.existsSync(file)) return;
  const original = parseStored(fs.readFileSync(file));
  // A newer app's v3 file is never converted here; read-only handling is in recovery.cjs.
  normalize(original, { allowNewer: true });
  if ([1, 2].includes(original.version)) {
    // Byte-for-byte original, never replace a prior migration backup.
    // A later v1/v2 file gets its own copy instead of reusing an older backup name.
    let backup = file + `.v${original.version}-backup.json`;
    for (let n = 2; fs.existsSync(backup); n++)
      backup = file + `.v${original.version}-backup-${n}.json`;
    fs.copyFileSync(file, backup, fs.constants.COPYFILE_EXCL);
    // The byte-original v1/v2 copy above already keeps the pre-modular file.
    return write(file, original, { keepLastGood: true, modularBackup: false });
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
  MAX_FILE_BYTES,
  setSealer,
  sealerActive,
  durableReplace,
  empty,
  validate: normalize,
  isNewerData,
  read,
  write,
  readBackup,
  writeBackup,
  migrateFile,
  lastGoodFile,
  preModularBackup,
  RESTORE_KEEP,
  restoreCopies,
  restoreCopyPath,
  restoreCopiesToPrune,
  pruneRestoreCopies,
  isTransientLock,
  retry,
  due,
};
