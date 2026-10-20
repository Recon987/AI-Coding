// TASK-SECURITY-02: the OS key protector for the data key. Windows: Electron safeStorage
// (DPAPI, tied to the signed-in Windows account). Where it is missing or would only
// obfuscate (Linux "basic_text"), encryption is not offered and the reason is shown.
const crypto = require("node:crypto");

// Test-only stand-in, honoured only by an unpackaged (development/test) app:
//   PARK_TEST_PROTECTOR=fake:<secret>  works like DPAPI for one "PC" named by <secret>
//   PARK_TEST_PROTECTOR=unavailable    as if this PC had no protector
function testProtector(value) {
  if (value === "unavailable") return { available: false, reason: "시험용: 보호기 없음" };
  const match = /^fake:(.+)$/.exec(value);
  if (!match) return null;
  const key = crypto.createHash("sha256").update(`park-test-protector:${match[1]}`).digest();
  return {
    available: true,
    test: true,
    protect(plain) {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
      return Buffer.concat([iv, cipher.update(plain), cipher.final(), cipher.getAuthTag()]);
    },
    unprotect(blob) {
      const decipher = crypto.createDecipheriv("aes-256-gcm", key, blob.subarray(0, 12));
      decipher.setAuthTag(blob.subarray(-16));
      return Buffer.concat([decipher.update(blob.subarray(12, -16)), decipher.final()]);
    },
  };
}

function osProtector({ safeStorage, isPackaged, env = process.env, platform = process.platform }) {
  if (!isPackaged && env.PARK_TEST_PROTECTOR) {
    const fake = testProtector(env.PARK_TEST_PROTECTOR);
    if (fake) return fake;
  }
  let available = false;
  try {
    available = safeStorage.isEncryptionAvailable();
  } catch {
    available = false;
  }
  if (!available) return { available: false, reason: "이 PC에서 운영체제 키 보호(safeStorage)를 쓸 수 없습니다" };
  if (platform === "linux" && safeStorage.getSelectedStorageBackend?.() === "basic_text")
    return { available: false, reason: "이 PC에 키링이 없어 운영체제 키 보호가 실제로 동작하지 않습니다" };
  return {
    available: true,
    protect: (plain) => safeStorage.encryptString(plain.toString("utf8")),
    unprotect: (blob) => Buffer.from(safeStorage.decryptString(blob), "utf8"),
  };
}

module.exports = { osProtector, testProtector };
