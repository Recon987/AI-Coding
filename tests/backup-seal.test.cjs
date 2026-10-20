// TASK-SECURITY-03 step 1: backup password rules, password-sealed backup, store readBackup/writeBackup.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const store = require("../desktop/store.cjs");
const seal = require("../desktop/seal.cjs");
const keystore = require("../desktop/keystore.cjs");
const backupSeal = require("../desktop/backup-seal.cjs");
const { passwordProblem, passwordStrength } = require("../shared/backup-password.mjs");
store.retry.wait = () => {};

// The real cost (N=2^17) is checked once; other cases use the lowest allowed cost to stay fast.
const FAST = { params: { N: 2 ** 14, r: 8, p: 1 } };
const PASSWORD = "가상 백업 암호 2026!";
const SECRET = "가상 백업 비밀 메모 한라산";
const sample = () => {
  const data = store.empty();
  data.notes.push({ id: "n1", title: SECRET, body: "가상 자료" });
  return data;
};
async function sandbox(run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "workdesk-backup-seal-"));
  try {
    return await run(dir);
  } finally {
    store.setSealer(null);
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("백업 암호 규칙: 10자 이상·256자 이하·같은 글자 반복 금지, 강도 안내", () => {
  for (const [value, message] of [
    ["", /입력/],
    [null, /입력/],
    ["짧은암호", /10자 이상/],
    ["a".repeat(257), /256자 이하/],
    ["aaaaaaaaaaaa", /되풀이/],
    ["abababababab", /되풀이/],
  ])
    assert.match(passwordProblem(value), message, String(value));
  assert.equal(passwordProblem("한글로 된 긴 암호"), "");
  assert.equal(passwordStrength("abcdefghij"), "약함");
  assert.equal(passwordStrength("abcdefghijkl"), "보통");
  assert.equal(passwordStrength("가상 백업 암호 2026!"), "보통");
  assert.equal(passwordStrength("가상 백업 암호는 2026년!"), "강함");
  assert.equal(passwordStrength("짧음"), "사용 불가");
});

test("실제 비용(scrypt N=2^17, r=8, p=1)으로 봉하고 열린다, 평문이 보이지 않는다", async () => {
  const plain = Buffer.from(JSON.stringify(sample()), "utf8");
  const envelope = await backupSeal.sealBackup(plain, PASSWORD);
  assert.equal(envelope.minReader, 3);
  assert.deepEqual([envelope.backupSealed.kdf, envelope.backupSealed.N, envelope.backupSealed.r, envelope.backupSealed.p], ["scrypt", 2 ** 17, 8, 1]);
  assert.ok(!JSON.stringify(envelope).includes(SECRET) && !JSON.stringify(envelope).includes(PASSWORD));
  assert.deepEqual(await backupSeal.openBackup(envelope, PASSWORD), plain);
  // NFC/NFD: the same Korean password typed another way still opens it.
  assert.deepEqual(await backupSeal.openBackup(envelope, PASSWORD.normalize("NFD")), plain);
});

test("틀린 암호·변조·잘림·형식 오류·과도한 비용은 거부", async () => {
  const plain = Buffer.from("가상", "utf8");
  const envelope = await backupSeal.sealBackup(plain, PASSWORD, FAST);
  await assert.rejects(backupSeal.openBackup(envelope, "다른 백업 암호 2026!"), { code: "BACKUP_PASSWORD_WRONG" });
  await assert.rejects(backupSeal.openBackup(envelope, ""), { code: "BACKUP_PASSWORD_REQUIRED" });
  const flip = (field) => {
    const copy = structuredClone(envelope);
    const bytes = Buffer.from(copy.backupSealed[field], "base64");
    bytes[0] ^= 1;
    copy.backupSealed[field] = bytes.toString("base64");
    return copy;
  };
  for (const field of ["data", "tag", "iv", "salt"])
    await assert.rejects(backupSeal.openBackup(flip(field), PASSWORD), { code: "BACKUP_PASSWORD_WRONG" }, field);
  for (const box of [
    { ...envelope.backupSealed, N: 2 ** 21 },
    { ...envelope.backupSealed, N: 3000 },
    { ...envelope.backupSealed, r: 64 },
    { ...envelope.backupSealed, kdf: "pbkdf2" },
    { ...envelope.backupSealed, tag: "AAAA" },
    { ...envelope.backupSealed, format: "x" },
  ])
    await assert.rejects(backupSeal.openBackup({ ...envelope, backupSealed: box }, PASSWORD), { code: "BACKUP_FORMAT" });
  await assert.rejects(backupSeal.sealBackup(plain, "짧은암호"), { code: "BACKUP_PASSWORD_WEAK" });
});

test("store.writeBackup → readBackup: 같은 자료, 임시 파일 없음, 암호 없이는 열리지 않음", () =>
  sandbox(async (dir) => {
    const file = path.join(dir, "백업.json");
    await store.writeBackup(file, sample(), PASSWORD, FAST);
    assert.ok(!fs.readFileSync(file, "utf8").includes(SECRET));
    assert.deepEqual((await store.readBackup(file, PASSWORD)).notes, sample().notes);
    await assert.rejects(store.readBackup(file), { code: "BACKUP_PASSWORD_REQUIRED" });
    await assert.rejects(store.readBackup(file, "다른 백업 암호 2026!"), { code: "BACKUP_PASSWORD_WRONG" });
    // The ordinary read path never opens it (startup, last-good, protection copies).
    assert.throws(() => store.read(file, { required: true }), { code: "BACKUP_PASSWORD_REQUIRED" });
    assert.deepEqual(fs.readdirSync(dir), ["백업.json"]);
  }));

test("다른 PC: 저장 암호화 키와 무관하게 암호만으로 열린다", () =>
  sandbox(async (dir) => {
    const file = path.join(dir, "이동 백업.json");
    const fake = { available: true, protect: (b) => b, unprotect: (b) => b };
    store.setSealer(keystore.ringOf(seal.createKeyring(fake).keyFile, crypto.randomBytes(32)));
    await store.writeBackup(file, sample(), PASSWORD, FAST);
    store.setSealer(null);
    assert.equal((await store.readBackup(file, PASSWORD)).notes[0].title, SECRET);
    store.setSealer(keystore.ringOf(seal.createKeyring(fake).keyFile, crypto.randomBytes(32)));
    assert.equal((await store.readBackup(file, PASSWORD)).notes[0].title, SECRET);
  }));

test("기존 평문 백업과 이 PC 키로 봉한 백업은 암호 없이 계속 읽힌다", () =>
  sandbox(async (dir) => {
    const plain = path.join(dir, "평문.json");
    store.write(plain, sample());
    assert.equal((await store.readBackup(plain)).notes[0].title, SECRET);
    assert.equal((await store.readBackup(plain, "무시되는 백업 암호")).notes[0].title, SECRET);
    const made = seal.createKeyring({ available: true, protect: (b) => b, unprotect: (b) => b });
    store.setSealer(keystore.ringOf(made.keyFile, made.dataKey));
    const sealed = path.join(dir, "봉함.json");
    store.write(sealed, sample());
    assert.equal((await store.readBackup(sealed)).notes[0].title, SECRET);
    // A broken file is still refused before anything could be written.
    fs.writeFileSync(plain, "{");
    await assert.rejects(store.readBackup(plain), SyntaxError);
  }));

test("암호 백업 안에 다른 봉투를 넣은 파일·검증 실패 자료는 거부", () =>
  sandbox(async (dir) => {
    const file = path.join(dir, "중첩.json");
    const inner = await backupSeal.sealBackup(Buffer.from(JSON.stringify(sample())), PASSWORD, FAST);
    fs.writeFileSync(file, JSON.stringify(await backupSeal.sealBackup(Buffer.from(JSON.stringify(inner)), PASSWORD, FAST)));
    await assert.rejects(store.readBackup(file, PASSWORD), { code: "BACKUP_FORMAT" });
    const broken = { ...sample(), patrols: [{ id: "p1" }] };
    fs.writeFileSync(file, JSON.stringify(await backupSeal.sealBackup(Buffer.from(JSON.stringify(broken)), PASSWORD, FAST)));
    await assert.rejects(store.readBackup(file, PASSWORD));
  }));

test("백업 쓰기 중 디스크 가득 참: 기존 백업 파일은 그대로", () =>
  sandbox(async (dir) => {
    const file = path.join(dir, "백업.json");
    await store.writeBackup(file, sample(), PASSWORD, FAST);
    const before = fs.readFileSync(file, "utf8");
    const writeSync = fs.writeSync;
    fs.writeSync = () => {
      throw Object.assign(new Error("ENOSPC: no space left on device"), { code: "ENOSPC" });
    };
    try {
      await assert.rejects(store.writeBackup(file, sample(), PASSWORD, FAST), /ENOSPC/);
    } finally {
      fs.writeSync = writeSync;
    }
    assert.equal(fs.readFileSync(file, "utf8"), before);
    assert.deepEqual(fs.readdirSync(dir), ["백업.json"]);
  }));
