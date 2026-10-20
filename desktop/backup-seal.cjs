// TASK-SECURITY-03: password-sealed backup file (design: docs/research/security-01-design.md 5장).
// scrypt(N=2^17, r=8, p=1) turns the backup password into a key; AES-256-GCM seals the
// same v3 JSON a plain backup holds. The password is never written anywhere.
const crypto = require("node:crypto");
const { promisify } = require("node:util");
const { passwordProblem } = require("../shared/backup-password.mjs");

const scrypt = promisify(crypto.scrypt);
const FORMAT = "park-workdesk-backup";
const DEFAULT_PARAMS = { N: 2 ** 17, r: 8, p: 1 };
const AAD = Buffer.from("park-workdesk:backup:v1", "utf8");

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}
const formatError = () => fail("BACKUP_FORMAT", "암호 백업 파일 형식이 올바르지 않습니다.");
const wrongPassword = () => fail("BACKUP_PASSWORD_WRONG", "백업 암호가 맞지 않거나 파일이 손상되었습니다. 암호를 다시 확인하세요.");
const b64 = (buffer) => buffer.toString("base64");
function unb64(value, bytes) {
  if (typeof value !== "string" || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw formatError();
  const buffer = Buffer.from(value, "base64");
  if (bytes !== undefined && buffer.length !== bytes) throw formatError();
  return buffer;
}
// A file names its own cost; bounds keep a crafted file from asking for gigabytes or minutes.
function checkedParams({ N, r, p }) {
  if (!Number.isInteger(N) || N < 2 ** 14 || N > 2 ** 18 || (N & (N - 1)) !== 0) throw formatError();
  if (!Number.isInteger(r) || r < 1 || r > 8 || !Number.isInteger(p) || p < 1 || p > 4) throw formatError();
  return { N, r, p };
}
function deriveKey(password, salt, { N, r, p }) {
  // NFC: the same Korean password typed on another PC derives the same key.
  return scrypt(password.normalize("NFC"), salt, 32, { N, r, p, maxmem: 256 * N * r + 32 * 1024 * 1024 });
}

/** True when parsed JSON is a password-sealed backup. */
function isBackupSealed(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && Object.hasOwn(value, "backupSealed");
}

/** Seal plaintext bytes with a backup password. `params` is for tests only. */
async function sealBackup(plain, password, { params = DEFAULT_PARAMS } = {}) {
  const problem = passwordProblem(password);
  if (problem) throw fail("BACKUP_PASSWORD_WEAK", problem);
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = await deriveKey(password, salt, checkedParams(params));
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(AAD);
  const data = Buffer.concat([cipher.update(plain), cipher.final()]);
  return {
    version: 3,
    // Reader-2 apps see a newer file and leave it alone (TASK-SCHEMA-01).
    minReader: 3,
    backupSealed: {
      format: FORMAT,
      version: 1,
      kdf: "scrypt",
      ...params,
      salt: b64(salt),
      alg: "AES-256-GCM",
      iv: b64(iv),
      tag: b64(cipher.getAuthTag()),
      data: b64(data),
    },
  };
}

/** Plaintext bytes of a sealed backup. Codes: BACKUP_PASSWORD_WRONG (wrong password or changed bytes), BACKUP_FORMAT. */
async function openBackup(envelope, password) {
  const box = envelope?.backupSealed;
  if (!isBackupSealed(envelope) || !box || typeof box !== "object" || box.format !== FORMAT || box.version !== 1 || box.kdf !== "scrypt" || box.alg !== "AES-256-GCM")
    throw formatError();
  if (typeof password !== "string" || !password) throw fail("BACKUP_PASSWORD_REQUIRED", "백업 암호를 입력하세요.");
  const params = checkedParams(box);
  const salt = unb64(box.salt, 16);
  const iv = unb64(box.iv, 12);
  const tag = unb64(box.tag, 16);
  const data = unb64(box.data);
  const key = await deriveKey(password, salt, params);
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAAD(AAD);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]);
  } catch {
    // GCM cannot tell a wrong password from changed bytes; neither may change anything.
    throw wrongPassword();
  }
}

module.exports = { DEFAULT_PARAMS, isBackupSealed, sealBackup, openBackup };
