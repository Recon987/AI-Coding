// TASK-SECURITY-02 step 1: envelope, data key and recovery key as pure functions.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const seal = require("../desktop/seal.cjs");

// Stand-in for safeStorage/DPAPI: AES-GCM under a key that only this "PC" knows.
function fakeProtector(secret = "가상 PC") {
  const key = crypto.createHash("sha256").update(secret).digest();
  return {
    protect(plain) {
      const iv = crypto.randomBytes(12);
      const c = crypto.createCipheriv("aes-256-gcm", key, iv);
      return Buffer.concat([iv, c.update(plain), c.final(), c.getAuthTag()]);
    },
    unprotect(blob) {
      const d = crypto.createDecipheriv("aes-256-gcm", key, blob.subarray(0, 12));
      d.setAuthTag(blob.subarray(-16));
      return Buffer.concat([d.update(blob.subarray(12, -16)), d.final()]);
    },
  };
}
const ring = (made) => ({ dataKey: made.dataKey, keyId: made.keyFile.keyId, recovery: made.keyFile.recovery });
const plain = Buffer.from(JSON.stringify({ version: 3, memo: "가상 메모 😀" }), "utf8");

test("복구 키: 4자리 6묶음(120비트), 대소문자·공백·혼동 글자 허용", () => {
  const key = seal.newRecoveryKey();
  assert.match(key, /^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){5}$/);
  assert.notEqual(seal.newRecoveryKey(), key);
  assert.equal(seal.normalizeRecoveryKey(` ${key.toLowerCase().replace(/-/g, " ")} `), key.replace(/-/g, ""));
  assert.equal(seal.normalizeRecoveryKey("OIL0-0000-0000-0000-0000-0000"), "011000000000000000000000");
  for (const bad of ["", "ABCD", "UUUU-0000-0000-0000-0000-0000", null, 12])
    assert.equal(seal.normalizeRecoveryKey(bad), null, String(bad));
});

test("키 파일: 평문 데이터 키가 없고, 보호기·복구 키로 같은 키가 열린다", () => {
  const protector = fakeProtector();
  const made = seal.createKeyring(protector);
  const text = JSON.stringify(made.keyFile);
  assert.equal(made.dataKey.length, 32);
  assert.ok(!text.includes(made.dataKey.toString("base64")), "평문 키(base64) 없음");
  assert.ok(!text.includes(made.dataKey.toString("hex")), "평문 키(hex) 없음");
  assert.ok(!text.includes(made.recoveryKey.replace(/-/g, "")), "복구 키 없음");
  assert.deepEqual(seal.unlockWithProtector(made.keyFile, protector), made.dataKey);
  assert.deepEqual(seal.unlockWithRecovery(made.keyFile.recovery, made.keyFile.keyId, made.recoveryKey), made.dataKey);
  assert.deepEqual(seal.unlockWithRecovery(made.keyFile.recovery, made.keyFile.keyId, made.recoveryKey.toLowerCase()), made.dataKey);
});

test("다른 PC(보호기)·변조된 키 파일·틀린 복구 키는 거부", () => {
  const made = seal.createKeyring(fakeProtector());
  assert.throws(() => seal.unlockWithProtector(made.keyFile, fakeProtector("다른 PC")), { code: "PROTECTOR" });
  const flipped = structuredClone(made.keyFile);
  flipped.protected.data = Buffer.from(Buffer.from(flipped.protected.data, "base64").map((b, i) => (i === 20 ? b ^ 1 : b))).toString("base64");
  assert.throws(() => seal.unlockWithProtector(flipped, fakeProtector()), { code: "PROTECTOR" });
  // A protector that "succeeds" with the wrong key is caught by the key check.
  const liar = { protect: (b) => b, unprotect: () => Buffer.from(crypto.randomBytes(32).toString("base64")) };
  assert.throws(() => seal.unlockWithProtector(made.keyFile, liar), { code: "PROTECTOR" });
  assert.throws(() => seal.unlockWithRecovery(made.keyFile.recovery, made.keyFile.keyId, seal.newRecoveryKey()), { code: "RECOVERY_WRONG" });
  assert.throws(() => seal.unlockWithRecovery(made.keyFile.recovery, "0000000000000000", made.recoveryKey), { code: "RECOVERY_WRONG" });
  assert.throws(() => seal.unlockWithRecovery(made.keyFile.recovery, made.keyFile.keyId, "1234"), { code: "RECOVERY_FORMAT" });
  for (const bad of [null, {}, { ...made.keyFile, format: "x" }, { ...made.keyFile, keyId: "../x" }, { ...made.keyFile, version: 2 }])
    assert.throws(() => seal.validKeyFile(bad), { code: "KEY_FILE" });
});

test("복구 키로 연 뒤 이 PC 보호기로 다시 감싼다(복구 정보 유지)", () => {
  const made = seal.createKeyring(fakeProtector("옛 PC"));
  const newPc = fakeProtector("새 PC");
  const key = seal.unlockWithRecovery(made.keyFile.recovery, made.keyFile.keyId, made.recoveryKey);
  const rewrapped = seal.rewrapKeyFile(made.keyFile, key, newPc);
  assert.deepEqual(seal.unlockWithProtector(rewrapped, newPc), made.dataKey);
  assert.deepEqual(rewrapped.recovery, made.keyFile.recovery);
  assert.throws(() => seal.rewrapKeyFile(made.keyFile, crypto.randomBytes(32), newPc), { code: "KEY_FILE" });
});

test("봉투: minReader 3, 평문이 보이지 않고, 같은 키로만 열린다", () => {
  const made = seal.createKeyring(fakeProtector());
  const envelope = seal.seal(ring(made), plain);
  assert.equal(envelope.version, 3);
  assert.equal(envelope.minReader, 3);
  assert.equal(envelope.sealed.alg, "AES-256-GCM");
  assert.ok(seal.isSealed(envelope));
  assert.ok(!seal.isSealed({ version: 3 }) && !seal.isSealed(null) && !seal.isSealed([]));
  assert.ok(!JSON.stringify(envelope).includes("memo"));
  assert.deepEqual(seal.open(ring(made), envelope), plain);
  // A fresh IV every time: sealing twice never gives the same bytes.
  assert.notEqual(seal.seal(ring(made), plain).sealed.data, envelope.sealed.data);
  // Another key ring: refused by key id before any decryption.
  const other = seal.createKeyring(fakeProtector());
  assert.throws(() => seal.open(ring(other), envelope), { code: "KEY_MISMATCH" });
  // Same key id but a different key (forged id) still fails authentication.
  assert.throws(() => seal.open({ ...ring(other), keyId: made.keyFile.keyId }, envelope), { code: "SEAL_TAMPERED" });
});

test("봉투 변조: 자료·태그·IV·키 ID 바꿈과 형식 오류를 모두 거부", () => {
  const made = seal.createKeyring(fakeProtector());
  const envelope = seal.seal(ring(made), plain);
  const flip = (field) => {
    const copy = structuredClone(envelope);
    const bytes = Buffer.from(copy.sealed[field], "base64");
    bytes[0] ^= 1;
    copy.sealed[field] = bytes.toString("base64");
    return copy;
  };
  for (const field of ["data", "tag", "iv"]) assert.throws(() => seal.open(ring(made), flip(field)), { code: "SEAL_TAMPERED" }, field);
  const truncated = structuredClone(envelope);
  truncated.sealed.data = truncated.sealed.data.slice(0, 8);
  assert.throws(() => seal.open(ring(made), truncated), { code: "SEAL_TAMPERED" });
  for (const bad of [
    { ...envelope, sealed: { ...envelope.sealed, alg: "none" } },
    { ...envelope, sealed: null },
    { ...envelope, sealed: { ...envelope.sealed, iv: "!!" } },
    { ...envelope, sealed: { ...envelope.sealed, tag: Buffer.alloc(4).toString("base64") } },
  ])
    assert.throws(() => seal.open(ring(made), bad), { code: /SEAL_FORMAT|SEAL_TAMPERED/ });
});

test("봉투만 남아도(키 파일 분실) 복구 키로 열린다", () => {
  const made = seal.createKeyring(fakeProtector());
  const envelope = JSON.parse(JSON.stringify(seal.seal(ring(made), plain)));
  const key = seal.unlockWithRecovery(envelope.sealed.recovery, envelope.sealed.keyId, made.recoveryKey);
  assert.deepEqual(seal.open({ dataKey: key, keyId: envelope.sealed.keyId }, envelope), plain);
});
