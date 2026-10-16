const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const store = require("../desktop/store.cjs");
const { openDataFile } = require("../desktop/recovery.cjs");

const NOW = Date.parse("2026-10-16T09:00:00Z");
function sandbox(run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "workdesk-recovery-"));
  return Promise.resolve(run(dir, path.join(dir, "workdesk.json"))).finally(() =>
    fs.rmSync(dir, { recursive: true, force: true }),
  );
}
const sample = (title = "보존할 메모") => {
  const data = store.empty();
  data.notes.push({ id: "n1", title, body: "가상 자료" });
  return data;
};
// Scripted dialog: answers are button labels, so tests do not depend on button order.
function fakeDialog(answers, openPaths = []) {
  const seen = [];
  return {
    seen,
    errors: [],
    async showMessageBox(options) {
      seen.push(options);
      const label = answers.shift();
      const index = options.buttons.indexOf(label);
      assert.ok(index >= 0, `버튼 없음: ${label} (${options.buttons.join(", ")})`);
      return { response: index };
    },
    async showOpenDialog() {
      const next = openPaths.shift();
      return next ? { canceled: false, filePaths: [next] } : { canceled: true, filePaths: [] };
    },
    showErrorBox(title, body) {
      this.errors.push(`${title}: ${body}`);
    },
  };
}
const corruptCopies = (dir) => fs.readdirSync(dir).filter((f) => f.includes(".corrupt-"));

test("주 파일 저장만 마지막 정상본을 함께 갱신하고 임시 파일을 남기지 않는다", () =>
  sandbox((dir, file) => {
    store.write(file, sample("첫 저장"), { keepLastGood: true });
    assert.deepEqual(store.read(store.lastGoodFile(file)), sample("첫 저장"));
    const backup = path.join(dir, "backup.json");
    store.write(backup, sample("백업"));
    assert.equal(fs.existsSync(store.lastGoodFile(backup)), false);
    assert.throws(() => store.write(file, { version: 3 }, { keepLastGood: true }));
    assert.deepEqual(store.read(file), sample("첫 저장"));
    assert.deepEqual(store.read(store.lastGoodFile(file)), sample("첫 저장"));
    assert.deepEqual(fs.readdirSync(dir).filter((f) => f.endsWith(".tmp")), []);
  }));

test("정상 파일은 바꾸지 않고 시작하며 처음 한 번 마지막 정상본을 만든다", () =>
  sandbox(async (dir, file) => {
    store.write(file, sample());
    const before = fs.readFileSync(file);
    const dialog = fakeDialog([]);
    assert.equal(await openDataFile({ file, store, dialog, now: () => NOW }), true);
    assert.deepEqual(fs.readFileSync(file), before);
    assert.deepEqual(store.read(store.lastGoodFile(file)), sample());
    assert.equal(dialog.seen.length, 0);
    assert.equal(await openDataFile({ file, store, dialog: fakeDialog([]) }), true);
  }));

test("손상 파일은 원본 그대로 보관한 뒤 마지막 정상본으로 시작할 수 있다", () =>
  sandbox(async (dir, file) => {
    store.write(file, sample("정상"), { keepLastGood: true });
    fs.writeFileSync(file, '{"version":3,"notes":[{"id":');
    const damaged = fs.readFileSync(file);
    const dialog = fakeDialog(["마지막 정상본으로 시작"]);
    assert.equal(await openDataFile({ file, store, dialog, now: () => NOW }), true);
    assert.deepEqual(store.read(file), sample("정상"));
    const copies = corruptCopies(dir);
    assert.equal(copies.length, 1);
    assert.deepEqual(fs.readFileSync(path.join(dir, copies[0])), damaged);
    assert.match(dialog.seen[0].detail, /지우지 않고/);
  }));

test("빈 파일·정상본 없음: 백업 선택을 취소해도 다시 묻고, 유효한 백업으로 복원한다", () =>
  sandbox(async (dir, file) => {
    fs.writeFileSync(file, "");
    const backup = path.join(dir, "backup.json");
    store.write(backup, sample("백업 자료"));
    const dialog = fakeDialog(["백업 파일에서 복원", "백업 파일에서 복원"], [null, backup]);
    assert.equal(await openDataFile({ file, store, dialog, now: () => NOW }), true);
    assert.equal(dialog.seen[0].buttons.includes("마지막 정상본으로 시작"), false);
    assert.match(dialog.seen[1].detail, /선택하지 않았습니다/);
    assert.deepEqual(store.read(file), sample("백업 자료"));
    assert.deepEqual(store.read(store.lastGoodFile(file)), sample("백업 자료"));
    assert.equal(corruptCopies(dir).length, 1);
  }));

test("잘못된 백업을 고른 뒤 종료하면 손상 원본을 그대로 둔다", () =>
  sandbox(async (dir, file) => {
    fs.writeFileSync(file, '{"version":9}');
    const bad = path.join(dir, "bad.json");
    fs.writeFileSync(bad, "not json");
    const dialog = fakeDialog(["백업 파일에서 복원", "종료"], [bad]);
    assert.equal(await openDataFile({ file, store, dialog, now: () => NOW }), false);
    assert.equal(fs.readFileSync(file, "utf8"), '{"version":9}');
    assert.match(dialog.seen[1].detail, /사용할 수 없습니다/);
    assert.equal(corruptCopies(dir).length, 1);
  }));

test("20MB를 넘는 파일도 보관 후 복구 선택으로 이어진다", () =>
  sandbox(async (dir, file) => {
    fs.writeFileSync(file, Buffer.alloc(20 * 1024 * 1024 + 1, 32));
    const dialog = fakeDialog(["종료"]);
    assert.equal(await openDataFile({ file, store, dialog, now: () => NOW }), false);
    assert.match(dialog.seen[0].detail, /20MB/);
    assert.equal(corruptCopies(dir).length, 1);
  }));

test("손상본을 보관하지 못하면 아무것도 쓰지 않고 시작을 중단한다", () =>
  sandbox(async (dir, file) => {
    store.write(file, sample(), { keepLastGood: true });
    fs.writeFileSync(file, "{");
    const original = fs.copyFileSync;
    fs.copyFileSync = () => {
      throw new Error("디스크 가득 참");
    };
    try {
      const dialog = fakeDialog([]);
      assert.equal(await openDataFile({ file, store, dialog, now: () => NOW }), false);
      assert.match(dialog.errors[0], /보존 실패/);
      assert.equal(dialog.seen.length, 0);
      assert.equal(fs.readFileSync(file, "utf8"), "{");
    } finally {
      fs.copyFileSync = original;
    }
  }));
