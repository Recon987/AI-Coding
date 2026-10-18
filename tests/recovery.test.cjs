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


test("선택 백업이 사라지거나 디렉터리이면 빈 자료로 복원하지 않는다", () =>
  sandbox(async (dir, file) => {
    fs.writeFileSync(file, "{damaged");
    for (const selected of [path.join(dir, "missing.json"), dir]) {
      const dialog = fakeDialog(["백업 파일에서 복원", "종료"], [selected]);
      assert.equal(await openDataFile({ file, store, dialog, now: () => NOW }), false);
      assert.match(dialog.seen[1].detail, /사용할 수 없습니다/);
      assert.equal(fs.readFileSync(file, "utf8"), "{damaged");
    }
  }));

test("주파일 저장 후 보호본 실패는 저장 성공과 경고를 반환하고 이전 보호본을 보존한다", () =>
  sandbox((dir, file) => {
    store.write(file, sample("이전"), { keepLastGood: true });
    const rename = fs.renameSync;
    fs.renameSync = (from, to) => {
      if (to === store.lastGoodFile(file)) throw new Error("ENOSPC");
      return rename(from, to);
    };
    try {
      const result = store.write(file, sample("새 기록"), { keepLastGood: true });
      assert.match(result.warning, /자료는 저장했지만/);
      assert.deepEqual(store.read(file), sample("새 기록"));
      assert.deepEqual(store.read(store.lastGoodFile(file)), sample("이전"));
      assert.deepEqual(fs.readdirSync(dir).filter(f => f.endsWith(".tmp")), []);
    } finally { fs.renameSync = rename; }
  }));

test("정상 파일의 보호본 준비 실패는 손상 복구로 보내지 않는다", () =>
  sandbox(async (dir, file) => {
    store.write(file, sample("정상"));
    const rename = fs.renameSync;
    fs.renameSync = (from, to) => {
      if (to === store.lastGoodFile(file)) throw new Error("EACCES");
      return rename(from, to);
    };
    try {
      const dialog = fakeDialog([]);
      const messages = [];
      const notices = [];
      assert.equal(await openDataFile({ file, store, dialog, logger: { warn: (...args) => messages.push(args) }, notify: (text) => notices.push(text) }), true);
      assert.equal(messages.length, 1);
      // TASK-POLISH-01: the renderer shows this instead of it living only in a log.
      assert.equal(notices.length, 1);
      assert.match(notices[0], /마지막 정상본.*만들지 못했습니다.*EACCES/);
      assert.equal(dialog.seen.length, 0);
      assert.equal(corruptCopies(dir).length, 0);
      assert.deepEqual(store.read(file), sample("정상"));
    } finally { fs.renameSync = rename; }
  }));

test("마지막 정상본 복구 쓰기 실패는 재선택 안내 후 종료할 수 있다", () =>
  sandbox(async (dir, file) => {
    store.write(file, sample("보호본"), { keepLastGood: true });
    fs.writeFileSync(file, "{damaged");
    const rename = fs.renameSync;
    fs.renameSync = (from, to) => {
      if (to === file) throw new Error("ENOSPC");
      return rename(from, to);
    };
    try {
      const dialog = fakeDialog(["마지막 정상본으로 시작", "종료"]);
      assert.equal(await openDataFile({ file, store, dialog, now: () => NOW }), false);
      assert.match(dialog.seen[1].detail, /복구하지 못했습니다.*ENOSPC/);
      assert.equal(fs.readFileSync(file, "utf8"), "{damaged");
      assert.deepEqual(store.read(store.lastGoodFile(file)), sample("보호본"));
    } finally { fs.renameSync = rename; }
  }));

test("주파일이 없고 정상본만 있으면 빈 시작 대신 복구 선택을 제공한다", () =>
  sandbox(async (dir, file) => {
    store.write(store.lastGoodFile(file), sample("보호본"));
    const dialog = fakeDialog(["마지막 정상본으로 시작"]);
    assert.equal(await openDataFile({ file, store, dialog }), true);
    assert.deepEqual(store.read(file), sample("보호본"));
    assert.equal(dialog.seen.length, 1);
    assert.equal(corruptCopies(dir).length, 0);
    assert.throws(() => store.read(path.join(dir, "gone.json"), { required: true }), /ENOENT/);
    assert.deepEqual(store.read(path.join(dir, "new.json")), store.empty());
  }));


test("주파일 교체 전 실패는 저장 실패이며 이전 주파일·보호본을 모두 유지한다", () =>
  sandbox((dir, file) => {
    store.write(file, sample("이전"), { keepLastGood: true });
    const rename = fs.renameSync;
    fs.renameSync = (from, to) => {
      if (to === file) throw new Error("ENOSPC");
      return rename(from, to);
    };
    try {
      assert.throws(() => store.write(file, sample("미확정"), { keepLastGood: true }), /ENOSPC/);
      assert.deepEqual(store.read(file), sample("이전"));
      assert.deepEqual(store.read(store.lastGoodFile(file)), sample("이전"));
      assert.deepEqual(fs.readdirSync(dir).filter(f => f.endsWith(".tmp")), []);
    } finally { fs.renameSync = rename; }
  }));

test("복구 후 보호본 갱신 실패는 시작은 하되 화면 경고로 전달한다", () =>
  sandbox(async (dir, file) => {
    fs.writeFileSync(file, "{damaged");
    const backup = path.join(dir, "backup.json");
    store.write(backup, sample("백업 자료"));
    const rename = fs.renameSync;
    fs.renameSync = (from, to) => {
      if (to === store.lastGoodFile(file)) throw new Error("ENOSPC");
      return rename(from, to);
    };
    try {
      const notices = [];
      const dialog = fakeDialog(["백업 파일에서 복원"], [backup]);
      assert.equal(await openDataFile({ file, store, dialog, now: () => NOW, notify: (t) => notices.push(t) }), true);
      assert.deepEqual(store.read(file), sample("백업 자료"));
      assert.equal(notices.length, 1);
      assert.match(notices[0], /자료는 저장했지만/);
    } finally { fs.renameSync = rename; }
  }));

test("다른 프로그램이 잠근 파일은 손상으로 보관하지 않고 다시 시도를 묻는다", () =>
  sandbox(async (dir, file) => {
    store.write(file, sample("잠긴 자료"), { keepLastGood: true });
    const read = fs.readFileSync;
    let locked = 6; // more than the store's own short retries
    fs.readFileSync = (target, ...rest) => {
      if (target === file && locked-- > 0) throw Object.assign(new Error("EBUSY: resource busy"), { code: "EBUSY" });
      return read(target, ...rest);
    };
    try {
      const dialog = fakeDialog(["다시 시도"]);
      assert.equal(await openDataFile({ file, store, dialog, now: () => NOW }), true);
      assert.equal(dialog.seen.length, 1);
      assert.match(dialog.seen[0].message, /다른 프로그램이 사용 중/);
      assert.equal(corruptCopies(dir).length, 0);
      assert.deepEqual(store.read(file), sample("잠긴 자료"));
      locked = 99;
      assert.equal(await openDataFile({ file, store, dialog: fakeDialog(["종료"]), now: () => NOW }), false);
      assert.equal(corruptCopies(dir).length, 0);
    } finally {
      fs.readFileSync = read;
    }
  }));

test("저장 교체가 잠깐 잠기면 재시도해 성공하고, v1/v2 백업 이름이 있으면 새 이름으로 원본을 남긴다", () =>
  sandbox((dir, file) => {
    const rename = fs.renameSync;
    let busy = 2;
    fs.renameSync = (from, to) => {
      if (to === file && busy-- > 0) throw Object.assign(new Error("EPERM"), { code: "EPERM" });
      return rename(from, to);
    };
    try {
      store.write(file, sample("재시도 저장"));
    } finally {
      fs.renameSync = rename;
    }
    assert.equal(busy, -1, "두 번 실패 후 성공");
    assert.deepEqual(store.read(file), sample("재시도 저장"));
    const v2 = JSON.stringify({ ...sample("두 번째 v2"), version: 2 });
    fs.writeFileSync(file + ".v2-backup.json", "earlier v2 original");
    fs.writeFileSync(file, v2);
    store.migrateFile(file);
    assert.equal(fs.readFileSync(file + ".v2-backup.json", "utf8"), "earlier v2 original");
    assert.equal(fs.readFileSync(file + ".v2-backup-2.json", "utf8"), v2);
  }));
