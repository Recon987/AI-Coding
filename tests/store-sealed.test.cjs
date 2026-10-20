// TASK-SECURITY-02 step 2: sealed storage in store.cjs and the key file (keystore.cjs).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const store = require("../desktop/store.cjs");
const seal = require("../desktop/seal.cjs");
const keystore = require("../desktop/keystore.cjs");
const { openDataFile } = require("../desktop/recovery.cjs");
store.retry.wait = () => {};

function fakeProtector(secret = "가상 PC") {
  const key = crypto.createHash("sha256").update(secret).digest();
  return {
    available: true,
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
const SECRET = "가상 비밀 메모 지리산";
const sample = () => {
  const data = store.empty();
  data.notes.push({ id: "n1", title: SECRET, body: "가상 자료" });
  return data;
};
async function sandbox(run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "workdesk-sealed-"));
  try {
    return await run(dir, path.join(dir, "workdesk.json"));
  } finally {
    store.setSealer(null);
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
function newRing() {
  const made = seal.createKeyring(fakeProtector());
  return { made, ring: keystore.ringOf(made.keyFile, made.dataKey) };
}
const noPlain = (file) => assert.ok(!fs.readFileSync(file, "utf8").includes(SECRET), `${path.basename(file)}에 평문 없음`);

test("봉함기 사용 중: 주 파일·last-good·보호본·백업이 모두 봉투, 임시 파일 없음, 다시 읽으면 같음", () =>
  sandbox((dir, file) => {
    const { ring } = newRing();
    store.setSealer(ring);
    assert.equal(store.write(file, sample(), { keepLastGood: true }), undefined);
    const backup = path.join(dir, "백업.json");
    store.write(backup, store.read(file));
    const copy = store.restoreCopyPath(file, 1);
    store.write(copy, store.read(file));
    for (const f of [file, store.lastGoodFile(file), backup, copy]) {
      noPlain(f);
      const outer = JSON.parse(fs.readFileSync(f, "utf8"));
      assert.equal(outer.minReader, 3);
      assert.equal(outer.sealed.keyId, ring.keyId);
      assert.deepEqual(store.read(f).notes, sample().notes);
    }
    assert.deepEqual(fs.readdirSync(dir).filter((n) => n.endsWith(".tmp")), []);
    // Main file and last-good are the same sealed bytes.
    assert.equal(fs.readFileSync(file, "utf8"), fs.readFileSync(store.lastGoodFile(file), "utf8"));
  }));

test("평문 파일은 봉함기 사용 중에도 읽히고, 다음 저장에서 봉투가 된다", () =>
  sandbox((dir, file) => {
    store.write(file, sample(), { keepLastGood: true });
    assert.ok(fs.readFileSync(file, "utf8").includes(SECRET));
    store.setSealer(newRing().ring);
    assert.equal(store.read(file).notes[0].title, SECRET);
    store.write(file, store.read(file), { keepLastGood: true });
    noPlain(file);
    noPlain(store.lastGoodFile(file));
  }));

test("키 없이·다른 키·변조된 봉투는 읽지 않고 원본 바이트를 그대로 둔다", () =>
  sandbox((dir, file) => {
    const { ring } = newRing();
    store.setSealer(ring);
    store.write(file, sample(), { keepLastGood: true });
    const original = fs.readFileSync(file);
    store.setSealer(null);
    assert.throws(() => store.read(file), { code: "SEALED_LOCKED" });
    store.setSealer(newRing().ring);
    assert.throws(() => store.read(file), { code: "KEY_MISMATCH" });
    store.setSealer(ring);
    const outer = JSON.parse(original);
    const data = Buffer.from(outer.sealed.data, "base64");
    data[5] ^= 1;
    outer.sealed.data = data.toString("base64");
    fs.writeFileSync(file, JSON.stringify(outer));
    assert.throws(() => store.read(file), { code: "SEAL_TAMPERED" });
    // write() of something else never needed the damaged bytes; restore them and compare.
    fs.writeFileSync(file, original);
    assert.deepEqual(store.read(file).notes, sample().notes);
  }));

test("변조된 주 파일로 시작하면 손상 사본(봉투 그대로)을 남기고 마지막 정상본을 제안한다", () =>
  sandbox(async (dir, file) => {
    store.setSealer(newRing().ring);
    store.write(file, sample(), { keepLastGood: true });
    const outer = JSON.parse(fs.readFileSync(file, "utf8"));
    outer.sealed.tag = Buffer.alloc(16).toString("base64");
    const damaged = JSON.stringify(outer);
    fs.writeFileSync(file, damaged);
    const seen = [];
    const dialog = {
      async showMessageBox(options) {
        seen.push(options);
        return { response: options.buttons.indexOf("마지막 정상본으로 시작") };
      },
      showErrorBox() {},
    };
    assert.equal(await openDataFile({ file, store, dialog, now: () => 0 }), true);
    assert.match(seen[0].detail, /손상되었거나 변경/);
    const corrupt = fs.readdirSync(dir).filter((n) => n.includes(".corrupt-"));
    assert.equal(corrupt.length, 1);
    assert.equal(fs.readFileSync(path.join(dir, corrupt[0]), "utf8"), damaged, "손상 사본은 바이트 그대로(평문 아님)");
    noPlain(file);
    assert.equal(store.read(file).notes[0].title, SECRET);
  }));

test("디스크 가득 참: 봉한 원본과 last-good은 그대로, 임시 파일 없음", () =>
  sandbox((dir, file) => {
    store.setSealer(newRing().ring);
    store.write(file, sample(), { keepLastGood: true });
    const before = [fs.readFileSync(file, "utf8"), fs.readFileSync(store.lastGoodFile(file), "utf8")];
    const writeSync = fs.writeSync;
    fs.writeSync = () => {
      throw Object.assign(new Error("ENOSPC: no space left on device"), { code: "ENOSPC" });
    };
    try {
      const changed = sample();
      changed.notes[0].body = "바뀐 내용";
      assert.throws(() => store.write(file, changed, { keepLastGood: true }), /ENOSPC/);
    } finally {
      fs.writeSync = writeSync;
    }
    assert.deepEqual([fs.readFileSync(file, "utf8"), fs.readFileSync(store.lastGoodFile(file), "utf8")], before);
    assert.deepEqual(fs.readdirSync(dir).filter((n) => n.endsWith(".tmp")), []);
  }));

test("20MB 한도는 평문 기준: 봉한 파일은 20MB를 넘어도 읽히고, 평문 20MB 초과는 저장 전에 거부", () =>
  sandbox((dir, file) => {
    store.setSealer(newRing().ring);
    const data = store.empty();
    // Base64 makes the sealed file about 4/3 of the plaintext.
    const note = (i) => ({ id: `big-${i}`, title: "가상 큰 메모", body: "가".repeat(20000) });
    for (let i = 0; i < 310; i++) data.notes.push(note(i)); // about 18.6MB of plaintext
    store.write(file, data);
    assert.ok(fs.statSync(file).size > 20 * 1024 * 1024);
    assert.equal(store.read(file).notes.length, 310);
    for (let i = 310; i < 360; i++) data.notes.push(note(i));
    assert.throws(() => store.write(file, data), /20MB/);
  }));

test("개편 전 보호본·v1 전환도 봉한 파일을 열어 판단한다", () =>
  sandbox((dir, file) => {
    store.setSealer(newRing().ring);
    // A sealed file that already has the modular keys gets no pre-modular copy.
    store.write(file, sample(), { modularBackup: false });
    assert.equal(store.preModularBackup(file, 1), null);
    assert.equal(store.migrateFile(file), undefined, "v3는 전환하지 않음");
    noPlain(file);
  }));

test("구버전(reader 2) 앱은 봉투를 '새 버전 자료'로 보고 파일을 바꾸지 않는다", async () => {
  // A reader-2 app is this app's model with READER_VERSION 2 and store.read = JSON.parse + normalize.
  const shared = fs.mkdtempSync(path.join(os.tmpdir(), "workdesk-reader2-"));
  try {
    for (const name of fs.readdirSync(path.join(__dirname, "../shared")))
      if (name.endsWith(".mjs")) fs.copyFileSync(path.join(__dirname, "../shared", name), path.join(shared, name));
    const modelFile = path.join(shared, "model.mjs");
    const source = fs.readFileSync(modelFile, "utf8");
    assert.match(source, /export const READER_VERSION = 3;/);
    fs.writeFileSync(modelFile, source.replace("export const READER_VERSION = 3;", "export const READER_VERSION = 2;"));
    const old = require(modelFile);
    assert.equal(old.READER_VERSION, 2);
    await sandbox(async (dir, file) => {
      store.setSealer(newRing().ring);
      store.write(file, sample(), { keepLastGood: true });
      store.setSealer(null);
      const bytes = fs.readFileSync(file);
      const envelope = JSON.parse(bytes);
      assert.ok(old.isNewerData(envelope));
      assert.throws(() => old.normalize(envelope), { code: "NEWER_DATA" });
      assert.throws(() => old.normalize(envelope, { allowNewer: true }), { code: "NEWER_DATA" });
      const oldStore = {
        ...store,
        isNewerData: old.isNewerData,
        read: (f, { allowNewer = false } = {}) => old.normalize(JSON.parse(fs.readFileSync(f, "utf8")), { allowNewer }),
        write() {
          throw new Error("구버전 앱이 쓰려고 함");
        },
      };
      const errors = [];
      const dialog = { showErrorBox: (title, body) => errors.push(`${title}: ${body}`), async showMessageBox() { throw new Error("묻지 않아야 함"); } };
      assert.equal(await openDataFile({ file, store: oldStore, dialog }), false);
      assert.match(errors[0], /새 버전 자료.*바꾸지 않았습니다/s);
      assert.deepEqual(fs.readFileSync(file), bytes);
      assert.deepEqual(fs.readdirSync(dir).sort(), ["workdesk.json", "workdesk.json.last-good"]);
    });
  } finally {
    fs.rmSync(shared, { recursive: true, force: true });
  }
});

test("키 파일: 켜기 → 이 PC 보호기로 열림 → 다른 PC는 잠김 → 복구 키로 열고 이 PC용으로 다시 감쌈", () =>
  sandbox((dir, file) => {
    store.write(file, sample(), { keepLastGood: true });
    const pcA = fakeProtector("PC A");
    assert.deepEqual(keystore.loadState({ dataFile: file, protector: pcA }), { status: "off" });
    const made = seal.createKeyring(pcA);
    assert.deepEqual(keystore.enable({ made, store, dataFile: file }), {});
    const keyFile = keystore.keyFilePath(file);
    assert.equal(path.basename(keyFile), "workdesk.key.json");
    assert.ok(!fs.readFileSync(keyFile, "utf8").includes(made.dataKey.toString("base64")));
    if (process.platform !== "win32") assert.equal(fs.statSync(keyFile).mode & 0o777, 0o600);
    noPlain(file);
    noPlain(store.lastGoodFile(file));
    assert.throws(() => keystore.enable({ made, store, dataFile: file }), /이미 켜져/);
    store.setSealer(null);

    const on = keystore.loadState({ dataFile: file, protector: pcA });
    assert.equal(on.status, "on");
    store.setSealer(on.ring);
    assert.equal(store.read(file).notes[0].title, SECRET);
    store.setSealer(null);

    const pcB = fakeProtector("PC B");
    const locked = keystore.loadState({ dataFile: file, protector: pcB });
    assert.equal(locked.status, "locked");
    assert.match(locked.reason, /복구 키/);
    const keyBytes = fs.readFileSync(keyFile, "utf8");
    assert.throws(() => keystore.unlock({ state: locked, recoveryKey: seal.newRecoveryKey(), protector: pcB, store, dataFile: file }), { code: "RECOVERY_WRONG" });
    assert.equal(fs.readFileSync(keyFile, "utf8"), keyBytes, "틀린 복구 키는 키 파일을 바꾸지 않음");
    const opened = keystore.unlock({ state: locked, recoveryKey: made.recoveryKey, protector: pcB, store, dataFile: file });
    assert.equal(opened.warning, "");
    assert.equal(keystore.loadState({ dataFile: file, protector: pcB }).status, "on", "다음 시작은 PC B에서 자동");
    assert.equal(keystore.loadState({ dataFile: file, protector: pcA }).status, "locked");
  }));

test("키 파일이 없어지거나 깨져도 봉투의 복구 정보로 잠김 상태가 되고 복구 키로 키 파일을 다시 만든다", () =>
  sandbox((dir, file) => {
    const pc = fakeProtector();
    const made = seal.createKeyring(pc);
    keystore.enable({ made, store, dataFile: file });
    store.setSealer(null);
    const keyFile = keystore.keyFilePath(file);
    for (const damage of [() => fs.rmSync(keyFile), () => fs.writeFileSync(keyFile, "{")]) {
      damage();
      const locked = keystore.loadState({ dataFile: file, protector: pc });
      assert.equal(locked.status, "locked");
      assert.equal(locked.keyId, made.keyFile.keyId);
      keystore.unlock({ state: locked, recoveryKey: made.recoveryKey, protector: pc, store, dataFile: file });
      assert.equal(keystore.loadState({ dataFile: file, protector: pc }).status, "on");
    }
    // A broken key file with no sealed data left has nothing to unlock: reported, not guessed.
    fs.rmSync(file);
    fs.rmSync(store.lastGoodFile(file));
    fs.writeFileSync(keyFile, "{");
    assert.equal(keystore.loadState({ dataFile: file, protector: pc }).status, "missing");
  }));

test("보호기를 쓸 수 없는 PC: 키 파일이 있으면 잠김, 복구 키로 열면 이번 실행만 열림을 경고", () =>
  sandbox((dir, file) => {
    const made = seal.createKeyring(fakeProtector());
    keystore.enable({ made, store, dataFile: file });
    store.setSealer(null);
    const none = { available: false, reason: "가상 사유" };
    const locked = keystore.loadState({ dataFile: file, protector: none });
    assert.equal(locked.status, "locked");
    assert.match(locked.reason, /가상 사유/);
    const before = fs.readFileSync(keystore.keyFilePath(file), "utf8");
    const opened = keystore.unlock({ state: locked, recoveryKey: made.recoveryKey, protector: none, store, dataFile: file });
    assert.match(opened.warning, /시작할 때마다 복구 키/);
    assert.equal(fs.readFileSync(keystore.keyFilePath(file), "utf8"), before);
  }));

test("켜기 실패: 키 파일을 쓰지 못하면 아무것도 바뀌지 않는다", () =>
  sandbox((dir, file) => {
    store.write(file, sample(), { keepLastGood: true });
    const before = fs.readFileSync(file, "utf8");
    const writeSync = fs.writeSync;
    fs.writeSync = () => {
      throw Object.assign(new Error("ENOSPC: no space left on device"), { code: "ENOSPC" });
    };
    try {
      assert.throws(() => keystore.enable({ made: seal.createKeyring(fakeProtector()), store, dataFile: file }), /ENOSPC/);
    } finally {
      fs.writeSync = writeSync;
    }
    assert.equal(store.sealerActive(), false);
    assert.equal(fs.readFileSync(file, "utf8"), before);
    assert.equal(fs.existsSync(keystore.keyFilePath(file)), false);
  }));
