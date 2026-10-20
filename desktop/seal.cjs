// TASK-SECURITY-02: storage envelope, data key and recovery key (design: docs/research/security-01-design.md).
// Pure node:crypto, no Electron: the OS protector (safeStorage/DPAPI) is passed in as
// { protect(Buffer) -> Buffer, unprotect(Buffer) -> Buffer }, so tests use a fake one.
const crypto = require("node:crypto");

const ALG = "AES-256-GCM";
const KEY_FORMAT = "park-workdesk-key";
// The envelope needs a reader that understands it; reader-2 apps open it read-only or stop
// without writing (TASK-SCHEMA-01 `isNewerData`).
const SEALED_MIN_READER = 3;
// Crockford base32 without I, L, O, U: 24 characters = 120 bits, shown as 6 groups of 4.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const RECOVERY_CHARS = 24;
const RECOVERY_INFO = "park-workdesk recovery key v1";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}
const b64 = (buffer) => Buffer.from(buffer).toString("base64");
function unb64(value, bytes) {
  if (typeof value !== "string" || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw fail("SEAL_FORMAT", "암호화 파일 형식이 올바르지 않습니다.");
  const buffer = Buffer.from(value, "base64");
  if (bytes !== undefined && buffer.length !== bytes) throw fail("SEAL_FORMAT", "암호화 파일 형식이 올바르지 않습니다.");
  return buffer;
}

function gcmSeal(key, plain, aad) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const data = Buffer.concat([cipher.update(plain), cipher.final()]);
  return { iv: b64(iv), tag: b64(cipher.getAuthTag()), data: b64(data) };
}
function gcmOpen(key, box, aad, code, message) {
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, unb64(box.iv, 12));
    decipher.setAAD(Buffer.from(aad, "utf8"));
    decipher.setAuthTag(unb64(box.tag, 16));
    return Buffer.concat([decipher.update(unb64(box.data)), decipher.final()]);
  } catch {
    // GCM gives no reason on purpose; a wrong key and changed bytes look the same.
    throw fail(code, message);
  }
}

/** A new recovery key: 6 groups of 4 characters (120 random bits). */
function newRecoveryKey() {
  const bytes = crypto.randomBytes(RECOVERY_CHARS);
  // 256 is a multiple of 32, so `% 32` is unbiased.
  const chars = [...bytes].map((b) => ALPHABET[b % 32]).join("");
  return chars.match(/.{4}/g).join("-");
}
/** Typed text to the 24 canonical characters, or null. Case, spaces, dashes and O/I/L are forgiven. */
function normalizeRecoveryKey(text) {
  if (typeof text !== "string") return null;
  const chars = text.toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  if (chars.length !== RECOVERY_CHARS || [...chars].some((c) => !ALPHABET.includes(c))) return null;
  return chars;
}
function recoveryKek(recoveryKey, salt) {
  const chars = normalizeRecoveryKey(recoveryKey);
  if (!chars) throw fail("RECOVERY_FORMAT", "복구 키는 4자리씩 6묶음(24자)입니다. 다시 확인하세요.");
  // 120 random bits need no slow KDF; HKDF separates this use from any other.
  return Buffer.from(crypto.hkdfSync("sha256", Buffer.from(chars, "ascii"), salt, RECOVERY_INFO, 32));
}
// Lets a key file be checked against a candidate data key without decrypting any data.
const keyCheck = (dataKey, keyId) => b64(crypto.createHmac("sha256", dataKey).update(`check:${keyId}`).digest().subarray(0, 16));

function wrapForRecovery(dataKey, keyId, recoveryKey) {
  const salt = crypto.randomBytes(16);
  return { kdf: "HKDF-SHA256", salt: b64(salt), ...gcmSeal(recoveryKek(recoveryKey, salt), dataKey, `recovery:${keyId}`) };
}

/**
 * A new key ring: random 256-bit data key, wrapped by the OS protector and by a new
 * recovery key. Returns the key file content (never holding the plain key), the data key
 * for this session and the recovery key to show once.
 */
function createKeyring(protector, { now = new Date() } = {}) {
  const dataKey = crypto.randomBytes(32);
  const keyId = crypto.randomBytes(8).toString("hex");
  const recoveryKey = newRecoveryKey();
  const keyFile = {
    format: KEY_FORMAT,
    version: 1,
    keyId,
    created: now.toISOString(),
    check: keyCheck(dataKey, keyId),
    protected: { method: "safeStorage", data: b64(protector.protect(Buffer.from(b64(dataKey), "utf8"))) },
    recovery: wrapForRecovery(dataKey, keyId, recoveryKey),
  };
  return { keyFile, dataKey, recoveryKey };
}

function validKeyFile(keyFile) {
  if (
    !keyFile || typeof keyFile !== "object" || keyFile.format !== KEY_FORMAT || keyFile.version !== 1 ||
    typeof keyFile.keyId !== "string" || !/^[0-9a-f]{16}$/.test(keyFile.keyId) ||
    typeof keyFile.check !== "string" || !keyFile.recovery || typeof keyFile.recovery !== "object"
  )
    throw fail("KEY_FILE", "암호화 키 파일 형식이 올바르지 않습니다.");
  return keyFile;
}
function checked(keyFile, dataKey, code, message) {
  if (dataKey.length !== 32 || !crypto.timingSafeEqual(Buffer.from(keyCheck(dataKey, keyFile.keyId)), Buffer.from(keyFile.check)))
    throw fail(code, message);
  return dataKey;
}
/** The data key via the OS protector (DPAPI). Fails with code PROTECTOR when it cannot be opened here. */
function unlockWithProtector(keyFile, protector) {
  validKeyFile(keyFile);
  let dataKey;
  try {
    dataKey = Buffer.from(protector.unprotect(unb64(keyFile.protected?.data)).toString("utf8"), "base64");
  } catch {
    throw fail("PROTECTOR", "이 PC의 Windows 계정으로 암호화 키를 열지 못했습니다. 복구 키를 입력하세요.");
  }
  return checked(keyFile, dataKey, "PROTECTOR", "이 PC의 Windows 계정으로 암호화 키를 열지 못했습니다. 복구 키를 입력하세요.");
}
/** The data key from a recovery-key wrap (key file `recovery` or an envelope's copy of it). */
function unlockWithRecovery(wrap, keyId, recoveryKey) {
  if (!wrap || typeof wrap !== "object") throw fail("KEY_FILE", "복구 정보가 없습니다.");
  const kek = recoveryKek(recoveryKey, unb64(wrap.salt, 16));
  const dataKey = gcmOpen(kek, wrap, `recovery:${keyId}`, "RECOVERY_WRONG", "복구 키가 맞지 않습니다. 종이에 적은 키를 다시 확인하세요.");
  if (dataKey.length !== 32) throw fail("RECOVERY_WRONG", "복구 키가 맞지 않습니다. 종이에 적은 키를 다시 확인하세요.");
  return dataKey;
}
/** The key file rewrapped with this PC's protector after a recovery-key unlock. */
function rewrapKeyFile(keyFile, dataKey, protector) {
  checked(validKeyFile(keyFile), dataKey, "KEY_FILE", "암호화 키가 키 파일과 맞지 않습니다.");
  return { ...keyFile, protected: { method: "safeStorage", data: b64(protector.protect(Buffer.from(b64(dataKey), "utf8"))) } };
}

const AAD = (keyId) => `park-workdesk:sealed:v1:${keyId}`;
/** True when parsed JSON is a sealed envelope (any reader level). */
function isSealed(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && Object.hasOwn(value, "sealed");
}
/**
 * Seal plaintext bytes. The envelope carries a copy of the recovery wrap, so a sealed
 * file stays openable with the paper recovery key even if workdesk.key.json is lost.
 */
function seal({ dataKey, keyId, recovery }, plain) {
  return {
    version: 3,
    minReader: SEALED_MIN_READER,
    sealed: { alg: ALG, keyId, ...gcmSeal(dataKey, plain, AAD(keyId)), recovery },
  };
}
function envelopeParts(envelope) {
  const sealed = envelope?.sealed;
  if (!isSealed(envelope) || !sealed || typeof sealed !== "object" || sealed.alg !== ALG || typeof sealed.keyId !== "string")
    throw fail("SEAL_FORMAT", "암호화 파일 형식이 올바르지 않습니다.");
  return sealed;
}
/** Plaintext bytes of an envelope. Codes: KEY_MISMATCH (another key ring), SEAL_TAMPERED, SEAL_FORMAT. */
function open({ dataKey, keyId }, envelope) {
  const sealed = envelopeParts(envelope);
  if (sealed.keyId !== keyId)
    throw fail("KEY_MISMATCH", "다른 암호화 키로 저장된 파일입니다. 이 PC의 키로는 열 수 없습니다.");
  return gcmOpen(dataKey, sealed, AAD(keyId), "SEAL_TAMPERED", "암호화된 자료가 손상되었거나 변경되었습니다.");
}

module.exports = {
  ALG,
  SEALED_MIN_READER,
  newRecoveryKey,
  normalizeRecoveryKey,
  createKeyring,
  validKeyFile,
  unlockWithProtector,
  unlockWithRecovery,
  rewrapKeyFile,
  isSealed,
  seal,
  open,
  envelopeParts,
};
