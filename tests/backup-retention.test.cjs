// TASK-BACKUP-02: only the newest restore protection copies are kept; nothing else is touched.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const store = require("../desktop/store.cjs");
store.retry.wait = () => {};

function sandbox(run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "workdesk-retention-"));
  try {
    return run(dir, path.join(dir, "workdesk.json"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("복원 보호본은 최근 5개만 남기고, 전환 백업·손상본·정상본·다른 파일은 그대로 둔다", () =>
  sandbox((dir, file) => {
    assert.equal(store.RESTORE_KEEP, 5);
    store.write(file, store.empty(), { keepLastGood: true });
    const keepers = [
      "workdesk.json.v1-backup.json",
      "workdesk.json.v2-backup-2.json",
      "workdesk.json.corrupt-2026-10-19T00-00-00-000Z.json",
      "workdesk.json.before-restore-abc.json",
      "other.json.before-restore-1.json",
      "공원업무수첩-백업.json",
    ];
    for (const name of keepers) fs.writeFileSync(path.join(dir, name), "{}");
    // Seven copies with out-of-order creation; age comes from the number in the name.
    for (const at of [7000, 1000, 3000, 2000, 6000, 5000, 4000])
      fs.writeFileSync(`${file}.before-restore-${at}.json`, "{}");
    assert.deepEqual(store.restoreCopies(file).map((c) => c.at), [1000, 2000, 3000, 4000, 5000, 6000, 7000]);
    const { removed, failed } = store.pruneRestoreCopies(file);
    assert.deepEqual(removed.map((c) => c.at), [1000, 2000]);
    assert.deepEqual(failed, []);
    assert.deepEqual(store.restoreCopies(file).map((c) => c.at), [3000, 4000, 5000, 6000, 7000]);
    for (const name of keepers) assert.ok(fs.existsSync(path.join(dir, name)), name);
    assert.ok(fs.existsSync(file) && fs.existsSync(store.lastGoodFile(file)));
    // Nothing to do at or under the limit.
    assert.deepEqual(store.pruneRestoreCopies(file).removed, []);
  }));

test("새 보호본 이름은 같은 시각이어도 겹치지 않고, 지우지 못한 파일은 보고만 한다", () =>
  sandbox((dir, file) => {
    fs.writeFileSync(`${file}.before-restore-100.json`, "{}");
    assert.equal(store.restoreCopyPath(file, 100), `${file}.before-restore-101.json`);
    assert.deepEqual(store.restoreCopies(path.join(dir, "missing", "workdesk.json")), []);
    for (const at of [1, 2, 3, 4, 5, 6]) fs.writeFileSync(`${file}.before-restore-${at}.json`, "{}");
    const original = fs.unlinkSync;
    fs.unlinkSync = (target) => {
      if (target.endsWith(".before-restore-1.json")) {
        const error = new Error("locked");
        error.code = "EPERM";
        throw error;
      }
      return original(target);
    };
    try {
      const { removed, failed } = store.pruneRestoreCopies(file);
      assert.deepEqual(failed.map((c) => c.at), [1]);
      assert.deepEqual(removed.map((c) => c.at), [2]);
    } finally {
      fs.unlinkSync = original;
    }
    assert.ok(fs.existsSync(`${file}.before-restore-1.json`));
  }));

// BK-01 (Codex review 2026-10-19): copies named with a clock that was once set ahead.
test("시계가 앞서 있던 때의 보호본이 있어도 새 보호본이 가장 새것이고 정리되지 않는다", () =>
  sandbox((dir, file) => {
    const future = Date.UTC(2027, 9, 19);
    for (let i = 0; i < 5; i++) fs.writeFileSync(`${file}.before-restore-${future + i}.json`, "{}");
    const now = Date.UTC(2026, 9, 19);
    const fresh = store.restoreCopyPath(file, now);
    assert.equal(fresh, `${file}.before-restore-${future + 5}.json`, "기존 최댓값보다 크게");
    const planned = store.restoreCopiesToPrune([...store.restoreCopies(file), { file: fresh, at: Infinity }], 5, [fresh]);
    fs.writeFileSync(fresh, "{}");
    const { removed } = store.pruneRestoreCopies(file, 5, [fresh]);
    assert.deepEqual(removed.map((c) => c.file), planned.map((c) => c.file), "안내한 대상 = 실제로 지운 대상");
    assert.deepEqual(removed.map((c) => c.at), [future]);
    assert.ok(fs.existsSync(fresh), "새 보호본은 남는다");
    // Even if a protected copy were the oldest by name, it is never deleted.
    fs.writeFileSync(`${file}.before-restore-1.json`, "{}");
    const { removed: again } = store.pruneRestoreCopies(file, 5, [`${file}.before-restore-1.json`]);
    assert.ok(!again.some((c) => c.at === 1));
    assert.ok(fs.existsSync(`${file}.before-restore-1.json`));
  }));
