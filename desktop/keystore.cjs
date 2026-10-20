// TASK-SECURITY-02: the key file workdesk.key.json beside workdesk.json, and the steps the
// main process takes with it: open at startup, recovery-key unlock, and turning encryption on.
// The OS protector is passed in (safeStorage in the app, a fake in tests).
const fs = require("node:fs");
const path = require("node:path");
const seal = require("./seal.cjs");

const keyFilePath = (dataFile) => path.join(path.dirname(dataFile), "workdesk.key.json");

function readKeyFile(file) {
  return seal.validKeyFile(JSON.parse(fs.readFileSync(file, "utf8")));
}
// The envelope's recovery wrap, when the data file is sealed and the key file cannot help.
function envelopeOf(dataFile) {
  try {
    const outer = JSON.parse(fs.readFileSync(dataFile, "utf8"));
    if (!seal.isSealed(outer)) return null;
    const sealed = seal.envelopeParts(outer);
    return sealed.recovery && typeof sealed.recovery === "object" ? { keyId: sealed.keyId, recovery: sealed.recovery } : null;
  } catch {
    return null;
  }
}
const ringOf = (keyFile, dataKey) => ({ dataKey, keyId: keyFile.keyId, recovery: keyFile.recovery });

/**
 * Startup state:
 * - { status: "off" } no key file and no sealed data: plaintext as before;
 * - { status: "on", ring } opened with the OS protector;
 * - { status: "locked", reason, keyId, recovery, keyFile? } a recovery key is needed;
 * - { status: "missing", reason } sealed data with no key information left (nothing to unlock).
 */
function loadState({ dataFile, protector }) {
  const file = keyFilePath(dataFile);
  let keyFile = null;
  let keyFileError = "";
  if (fs.existsSync(file)) {
    try {
      keyFile = readKeyFile(file);
    } catch (error) {
      keyFileError = `암호화 키 파일을 읽지 못했습니다(${error.message}).`;
    }
  }
  if (keyFile) {
    if (!protector.available)
      return { status: "locked", reason: `이 PC에서는 Windows 계정 보호(DPAPI)를 쓸 수 없습니다(${protector.reason}).`, keyId: keyFile.keyId, recovery: keyFile.recovery, keyFile };
    try {
      return { status: "on", ring: ringOf(keyFile, seal.unlockWithProtector(keyFile, protector)), keyFile };
    } catch (error) {
      return { status: "locked", reason: error.message, keyId: keyFile.keyId, recovery: keyFile.recovery, keyFile };
    }
  }
  const envelope = envelopeOf(dataFile) ?? envelopeOf(dataFile + ".last-good");
  if (envelope)
    return {
      status: "locked",
      reason: keyFileError || "암호화 키 파일(workdesk.key.json)이 없습니다. 복구 키로 열 수 있습니다.",
      ...envelope,
    };
  if (keyFileError) return { status: "missing", reason: keyFileError };
  return { status: "off" };
}

function writeKeyFile(store, dataFile, keyFile) {
  store.durableReplace(keyFilePath(dataFile), JSON.stringify(keyFile, null, 2));
}

/**
 * Recovery-key unlock of a locked state. With a working protector the key file is
 * rewritten for this PC so the next start opens by itself; failing that only warns.
 */
function unlock({ state, recoveryKey, protector, store, dataFile }) {
  const dataKey = seal.unlockWithRecovery(state.recovery, state.keyId, recoveryKey);
  const ring = { dataKey, keyId: state.keyId, recovery: state.recovery };
  let warning = "";
  if (protector.available) {
    try {
      const next = state.keyFile ? seal.rewrapKeyFile(state.keyFile, dataKey, protector) : seal.buildKeyFile(ring, protector);
      writeKeyFile(store, dataFile, next);
    } catch (error) {
      warning = `복구 키로 열었지만 이 PC용 키를 저장하지 못했습니다(${error.message}). 다음 시작 때 복구 키를 다시 입력해야 합니다.`;
    }
  } else warning = "이 PC에서는 Windows 계정 보호를 쓸 수 없어 시작할 때마다 복구 키를 입력해야 합니다.";
  return { ring, warning };
}

/**
 * Turns encryption on with a key ring made by seal.createKeyring and confirmed by the user.
 * Order: key file first (nothing else changes if that fails), then the data rewritten sealed.
 */
function enable({ made, store, dataFile, now = Date.now }) {
  const file = keyFilePath(dataFile);
  let broken = false;
  if (fs.existsSync(file)) {
    try {
      readKeyFile(file);
    } catch {
      broken = true;
    }
    if (!broken) throw new Error("저장 암호화가 이미 켜져 있습니다.");
  }
  // Read before anything is written: an unreadable file is not touched.
  const data = store.read(dataFile);
  // A damaged key file is kept aside, never deleted (a sealed copy may still need it).
  if (broken) fs.renameSync(file, `${file}.broken-${now()}`);
  writeKeyFile(store, dataFile, made.keyFile);
  store.setSealer(ringOf(made.keyFile, made.dataKey));
  try {
    return store.write(dataFile, data, { keepLastGood: true }) ?? {};
  } catch (error) {
    // The key is in place and every later save is sealed; the file kept its old bytes.
    return { warning: `암호화를 켰지만 자료를 바로 다시 저장하지 못했습니다(${error.message}). 다음 저장 때 암호화됩니다.` };
  }
}

module.exports = { keyFilePath, loadState, unlock, enable, ringOf };
