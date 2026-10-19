// 독립 감사용: node --test tests/data-safety-audit.cjs
// 기존 npm test 목록에는 포함하지 않는다. 실제 사용자 프로필을 읽지 않는다.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const store = require("../desktop/store.cjs");
const { openDataFile } = require("../desktop/recovery.cjs");
const { READER_VERSION } = require("../shared/model.mjs");

const sample = (title = "가상 원본") => ({
  ...store.empty(), notes: [{ id: "audit-note", title, body: "가상 자료만 사용" }],
});
async function sandbox(run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "park-data-audit-"));
  try { await run(dir, path.join(dir, "workdesk.json")); }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
async function patch(name, replacement, run) {
  const original = fs[name];
  fs[name] = replacement(original);
  try { await run(); } finally { fs[name] = original; }
}
const diskError = (code) => Object.assign(new Error(`감사 오류 주입: ${code}`), { code });
const bytes = (file) => fs.readFileSync(file);
const noTemporary = (dir) => assert.deepEqual(fs.readdirSync(dir).filter(n => n.endsWith(".tmp")), []);

for (const phase of ["openSync", "writeSync", "fsyncSync", "renameSync"]) {
  test(`저장 ${phase} 실패: 기존 주파일·보호본 바이트 보존`, () => sandbox(async (dir, file) => {
    store.write(file, sample(), { keepLastGood: true });
    const before = bytes(file), good = bytes(store.lastGoodFile(file));
    await patch(phase, () => () => { throw diskError("ENOSPC"); }, () => {
      assert.throws(() => store.write(file, sample("실패해야 하는 저장"), { keepLastGood: true }), /ENOSPC/);
    });
    assert.deepEqual(bytes(file), before);
    assert.deepEqual(bytes(store.lastGoodFile(file)), good);
    noTemporary(dir);
  }));
}

test("부분 쓰기를 여러 번 수행해도 한글 자료를 완전하게 저장", () => sandbox(async (dir, file) => {
  const data = sample("가상 한글·좌표·이모지 🏞 보존");
  await patch("writeSync", original => (fd, buffer, offset, length) => original(fd, buffer, offset, Math.min(length, 7)), () => {
    store.write(file, data, { keepLastGood: true });
  });
  assert.deepEqual(store.read(file), data);
  assert.deepEqual(store.read(store.lastGoodFile(file)), data);
  noTemporary(dir);
}));

test("주파일 확정 후 보호본 실패: 성공 경고와 새 주파일·이전 보호본 구분", () => sandbox(async (dir, file) => {
  store.write(file, sample(), { keepLastGood: true });
  const previous = bytes(store.lastGoodFile(file));
  await patch("renameSync", original => (from, to) => {
    if (to === store.lastGoodFile(file)) throw diskError("ENOSPC");
    return original(from, to);
  }, () => {
    assert.match(store.write(file, sample("확정된 새 자료"), { keepLastGood: true }).warning, /자료는 저장했지만/);
  });
  assert.equal(store.read(file).notes[0].title, "확정된 새 자료");
  assert.deepEqual(bytes(store.lastGoodFile(file)), previous);
  noTemporary(dir);
}));

test("영구 잠금 재시도 소진: 미확정 자료를 쓰지 않음", () => sandbox(async (dir, file) => {
  store.write(file, sample(), { keepLastGood: true });
  const before = bytes(file), wait = store.retry.wait;
  let attempts = 0;
  store.retry.wait = () => {};
  try {
    await patch("renameSync", () => () => { attempts++; throw diskError("EBUSY"); }, () => {
      assert.throws(() => store.write(file, sample("잠금 중 저장"), { keepLastGood: true }), /EBUSY/);
    });
  } finally { store.retry.wait = wait; }
  assert.equal(attempts, 5);
  assert.deepEqual(bytes(file), before);
  assert.deepEqual(bytes(store.lastGoodFile(file)), before);
  noTemporary(dir);
}));

for (const version of [1, 2]) {
  test(`v${version} 전환 중 교체 실패·재시도: 원본 백업과 알 수 없는 값 보존`, () => sandbox(async (dir, file) => {
    const input = { version, notes: sample().notes, calls: [], events: [], folders: [],
      ...(version === 2 ? { patrols: [], tasks: [] } : {}),
      futureLedger: { rows: [{ id: "가상", value: 0 }], nested: [null, false, "한글"] } };
    const raw = Buffer.from(JSON.stringify(input, null, 1) + "\n");
    fs.writeFileSync(file, raw);
    await patch("renameSync", original => (from, to) => {
      if (to === file) throw diskError("ENOSPC");
      return original(from, to);
    }, () => assert.throws(() => store.migrateFile(file), /ENOSPC/));
    assert.deepEqual(bytes(file), raw);
    assert.deepEqual(bytes(`${file}.v${version}-backup.json`), raw);
    store.migrateFile(file);
    assert.deepEqual(bytes(`${file}.v${version}-backup.json`), raw);
    assert.deepEqual(bytes(`${file}.v${version}-backup-2.json`), raw);
    assert.equal(store.read(file).version, 3);
    assert.deepEqual(store.read(file).futureLedger, input.futureLedger);
    assert.deepEqual(store.read(store.lastGoodFile(file)), store.read(file));
    const names = fs.readdirSync(dir);
    store.migrateFile(file);
    assert.deepEqual(fs.readdirSync(dir), names);
    noTemporary(dir);
  }));
}

test("20MB·10,000건 한도: 초과 입력은 기존 자료를 덮지 않음", () => sandbox(async (dir, file) => {
  const maximum = { ...store.empty(), notes: Array.from({ length: 10000 }, (_, i) => ({ id: `n${i}`, title: "가상", body: "" })) };
  store.write(file, maximum, { keepLastGood: true });
  assert.equal(store.read(file).notes.length, 10000);
  const before = bytes(file);
  assert.throws(() => store.write(file, { ...maximum, notes: [...maximum.notes, { id: "overflow", title: "가상", body: "" }] }), /크기|형식/);
  assert.deepEqual(bytes(file), before);
  // 알 수 없는 값도 파일 전체의 바이트 한도를 우회할 수 없다.
  assert.throws(() => store.write(file, { ...sample(), extra: "가".repeat(7 * 1024 * 1024) }), /20MB/);
  assert.deepEqual(bytes(file), before);
  assert.deepEqual(bytes(store.lastGoodFile(file)), before);
  noTemporary(dir);
}));

test("누락 주파일·정상 보호본: 종료 선택은 빈 자료를 만들지 않음", () => sandbox(async (dir, file) => {
  store.write(store.lastGoodFile(file), sample());
  const before = bytes(store.lastGoodFile(file));
  const opened = await openDataFile({ file, store, dialog: {
    showMessageBox: async options => ({ response: options.buttons.indexOf("종료") }),
    showErrorBox: () => assert.fail("정상 보호본에서 보존 실패 없음"),
  } });
  assert.equal(opened, false);
  assert.equal(fs.existsSync(file), false);
  assert.deepEqual(bytes(store.lastGoodFile(file)), before);
}));

test("미래 읽기 수준 자료: 시작·저장 시 원본 바이트와 파일 목록 보존", () => sandbox(async (dir, file) => {
  const data = { ...sample(), minReader: READER_VERSION + 1, futureLedger: [1, null, { flag: true }] };
  fs.writeFileSync(file, JSON.stringify(data));
  const before = bytes(file), names = fs.readdirSync(dir);
  const dialog = { showMessageBox: () => assert.fail("손상 복구로 보내면 안 됨"), showErrorBox: () => assert.fail("해석 가능한 미래 자료") };
  assert.equal(await openDataFile({ file, store, dialog }), "read-only");
  assert.throws(() => store.write(file, data), e => e.code === "NEWER_DATA");
  assert.deepEqual(bytes(file), before);
  assert.deepEqual(fs.readdirSync(dir), names);
}));

test("잘못된 백업 파일·디렉터리·20MB 초과 읽기 거부 후 원본 보존", () => sandbox(async (dir, file) => {
  store.write(file, sample(), { keepLastGood: true });
  const before = bytes(file), good = bytes(store.lastGoodFile(file));
  const invalid = path.join(dir, "invalid.json"), huge = path.join(dir, "huge.json");
  fs.writeFileSync(invalid, '{"version":3,"notes":[');
  fs.writeFileSync(huge, " ".repeat(20 * 1024 * 1024 + 1));
  for (const selected of [invalid, huge, dir, path.join(dir, "missing.json")])
    assert.throws(() => store.read(selected, { required: true }));
  assert.deepEqual(bytes(file), before);
  assert.deepEqual(bytes(store.lastGoodFile(file)), good);
}));
