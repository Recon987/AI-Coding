// TASK-SCHEMA-01: minReader (mixed app versions) and keeping unknown top-level keys.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const store = require("../desktop/store.cjs");
const { openDataFile } = require("../desktop/recovery.cjs");
const { normalize, isNewerData, READER_VERSION, NEWER_DATA_MESSAGE } = require("../shared/model.mjs");
store.retry.wait = () => {};

const NEWER = READER_VERSION + 1;
const sample = (extra = {}) => {
  const data = store.empty();
  data.notes.push({ id: "n1", title: "가상 메모", body: "가상 자료" });
  return { ...data, ...extra };
};
function sandbox(run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "workdesk-schema-"));
  return Promise.resolve(run(dir, path.join(dir, "workdesk.json"))).finally(() =>
    fs.rmSync(dir, { recursive: true, force: true }),
  );
}
const writeRaw = (file, value) => fs.writeFileSync(file, JSON.stringify(value));
function fakeDialog() {
  return {
    boxes: [],
    errors: [],
    async showMessageBox(options) {
      this.boxes.push(options);
      return { response: options.cancelId ?? 0 };
    },
    async showOpenDialog() {
      return { canceled: true, filePaths: [] };
    },
    showErrorBox(title, body) {
      this.errors.push(`${title}: ${body}`);
    },
  };
}

test("minReader가 없는 기존 자료는 그대로 읽고 저장 결과에 minReader를 만들지 않는다", () => {
  const result = normalize(sample());
  assert.equal(Object.hasOwn(result, "minReader"), false);
  assert.equal(isNewerData(sample()), false);
});

test("이 버전이 읽을 수 있는 minReader는 보존하고 잘못된 값은 거부한다", () => {
  assert.equal(normalize(sample({ minReader: READER_VERSION })).minReader, READER_VERSION);
  for (const bad of [0, -1, 1.5, "2", null, 1000001])
    assert.throws(() => normalize(sample({ minReader: bad })), /minReader/, String(bad));
});

test("더 새 버전 자료는 저장 경로에서 거부하고, 읽기 전용 읽기만 허용한다", () => {
  const newer = sample({ minReader: NEWER });
  assert.equal(isNewerData(newer), true);
  assert.throws(() => normalize(newer), (error) => error.code === "NEWER_DATA" && error.message === NEWER_DATA_MESSAGE);
  const shown = normalize(newer, { allowNewer: true });
  assert.equal(shown.minReader, NEWER);
  assert.equal(shown.notes[0].title, "가상 메모");
  // Content this version cannot read is still not 'damaged': it fails as NEWER_DATA.
  const unknownKind = sample({ minReader: NEWER });
  unknownKind.patrols.push({
    id: "p1", title: "가상 순찰", at: "2026-10-19T09:00:00+09:00", route: "가상 구간", observer: "가상직원",
    findings: "", action: "", risk: "normal", kind: "future-kind",
  });
  assert.throws(() => normalize(unknownKind, { allowNewer: true }), (error) =>
    error.code === "NEWER_DATA" && error.message.includes("순찰 종류"));
});

test("모르는 최상위 항목은 값 그대로 보존하고 저장·다시 읽기 후에도 남는다", () =>
  sandbox((dir, file) => {
    const future = { inspections: [{ id: "i1", facility: "가상 데크" }], settingsV9: { theme: "dark" } };
    const result = normalize(sample(future));
    assert.deepEqual(result.inspections, future.inspections);
    assert.deepEqual(result.settingsV9, future.settingsV9);
    store.write(file, sample(future), { keepLastGood: true });
    const reread = store.read(file);
    assert.deepEqual(reread.inspections, future.inspections);
    assert.deepEqual(store.read(store.lastGoodFile(file)).settingsV9, future.settingsV9);
    // v1/v2 conversion keeps them as well.
    const v2 = { version: 2, notes: [], events: [], calls: [], folders: [], patrols: [], tasks: [], inspections: [] };
    assert.deepEqual(normalize(v2).inspections, []);
  }));

test("모르는 최상위 항목 이름·개수는 제한한다", () => {
  const withProto = JSON.parse(JSON.stringify(sample()).replace(/^\{/, '{"__proto__":{"x":1},'));
  assert.equal(Object.hasOwn(withProto, "__proto__"), true);
  assert.throws(() => normalize(withProto), /최상위/);
  assert.throws(() => normalize(sample({ ["a".repeat(65)]: 1 })), /최상위/);
  const many = Object.fromEntries(Array.from({ length: 101 }, (_, i) => [`k${i}`, i]));
  assert.throws(() => normalize(sample(many)), /최상위/);
  assert.doesNotThrow(() => normalize(sample(Object.fromEntries(Object.entries(many).slice(0, 100)))));
});

test("store.write는 더 새 버전 자료를 쓰지 않고 파일을 바꾸지 않는다", () =>
  sandbox((dir, file) => {
    store.write(file, sample());
    const before = fs.readFileSync(file, "utf8");
    assert.throws(() => store.write(file, sample({ minReader: NEWER })), (error) => error.code === "NEWER_DATA");
    assert.equal(fs.readFileSync(file, "utf8"), before);
    assert.throws(() => store.read(file + ".missing", { required: true }));
  }));

test("시작: 읽을 수 있는 새 버전 파일은 손상 처리·변환·보호본 없이 읽기 전용으로 연다", () =>
  sandbox(async (dir, file) => {
    writeRaw(file, sample({ minReader: NEWER }));
    const raw = fs.readFileSync(file, "utf8");
    const dialog = fakeDialog();
    assert.equal(await openDataFile({ file, store, dialog }), "read-only");
    assert.equal(fs.readFileSync(file, "utf8"), raw);
    assert.deepEqual(fs.readdirSync(dir), ["workdesk.json"]);
    assert.deepEqual(dialog.boxes, []);
    assert.equal(store.read(file, { allowNewer: true }).minReader, NEWER);
  }));

test("시작: 읽을 수 없는 새 버전 파일은 복구 흐름(이전 정상본 덮어쓰기)으로 가지 않고 종료한다", () =>
  sandbox(async (dir, file) => {
    const newer = sample({ minReader: NEWER });
    newer.notes[0].title = "";
    writeRaw(file, newer);
    // An older last-good copy exists; it must not replace the newer file.
    store.write(store.lastGoodFile(file), sample());
    const raw = fs.readFileSync(file, "utf8");
    const dialog = fakeDialog();
    assert.equal(await openDataFile({ file, store, dialog }), false);
    assert.equal(fs.readFileSync(file, "utf8"), raw);
    assert.equal(fs.readdirSync(dir).some((name) => name.includes(".corrupt-")), false);
    assert.deepEqual(dialog.boxes, []);
    assert.equal(dialog.errors.length, 1);
    assert.match(dialog.errors[0], /새 버전 자료: .*바꾸지 않았습니다/s);
  }));
