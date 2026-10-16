const { test } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  readSettings,
  loadSettings,
  writeSettings,
} = require("../desktop/settings.cjs");
const { createDesktopLifecycle } = require("../desktop/lifecycle.cjs");
const {
  selectDue,
  receiptKey,
  pruneReceipts,
  readReceipts,
  writeReceipts,
  createNotifier,
  CATCHUP_WINDOW_MS,
} = require("../desktop/notifications.cjs");

function workspace(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "park-policy-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}
test("PC 설정은 기본 종료·엄격 bool·원자 저장을 지키고 손상 원본을 보존", (t) => {
  const dir = workspace(t),
    file = path.join(dir, "desktop-settings.json");
  assert.deepEqual(readSettings(file), { version: 1, closeToTray: false });
  writeSettings(file, { version: 1, closeToTray: true });
  const original = fs.readFileSync(file, "utf8");
  for (const bad of [
    null,
    [],
    { version: 1, closeToTray: "false" },
    { version: 1, closeToTray: 1 },
    { version: 2, closeToTray: false },
    { version: 1, closeToTray: true, workdesk: {} },
  ])
    assert.throws(() => writeSettings(file, bad));
  assert.equal(fs.readFileSync(file, "utf8"), original);
  fs.writeFileSync(file, "{damaged");
  assert.deepEqual(loadSettings(file).settings, {
    version: 1,
    closeToTray: false,
  });
  assert.match(loadSettings(file).message, /보존/);
  assert.equal(fs.readFileSync(file, "utf8"), "{damaged");
  writeSettings(file, { version: 1, closeToTray: true });
  assert.equal(
    fs.readFileSync(file + ".invalid-backup.json", "utf8"),
    "{damaged",
  );
  assert.equal(fs.existsSync(file + ".tmp"), false);
});
test("PC 설정 쓰기 실패는 이전 파일과 임시파일 정리를 보장", (t) => {
  const dir = workspace(t),
    file = path.join(dir, "desktop-settings.json");
  writeSettings(file, { version: 1, closeToTray: false });
  fs.mkdirSync(file + ".tmp");
  // A blocked temporary destination must never replace the saved preference.
  assert.throws(() => writeSettings(file, { version: 1, closeToTray: true }));
  assert.equal(readSettings(file).closeToTray, false);
});

function lifecycleFixture(t, options = {}) {
  const dir = workspace(t),
    file = path.join(dir, "desktop-settings.json");
  if (options.enabled) writeSettings(file, { version: 1, closeToTray: true });
  const app = new EventEmitter();
  const win = new EventEmitter();
  win.webContents = new EventEmitter();
  Object.assign(win, {
    visible: true,
    minimized: false,
    focused: false,
    isDestroyed: () => false,
    isMinimized: () => win.minimized,
    restore: () => {
      win.minimized = false;
    },
    show: () => {
      win.visible = true;
    },
    hide: () => {
      win.visible = false;
    },
    focus: () => {
      win.focused = true;
    },
  });
  app.quit = () => app.emit("before-quit");
  const created = [];
  class FakeTray extends EventEmitter {
    constructor() {
      super();
      if (options.failTray) throw new Error("tray unavailable");
      created.push(this);
      this.destroyed = false;
    }
    setToolTip() {}
    setContextMenu(value) {
      this.menu = value;
    }
    isDestroyed() {
      return this.destroyed;
    }
    destroy() {
      this.destroyed = true;
    }
  }
  let response = 0;
  const lifecycle = createDesktopLifecycle({
    app,
    win,
    Tray: FakeTray,
    Menu: { buildFromTemplate: (value) => value },
    nativeImage: {
      createFromPath: () => ({ isEmpty: () => !!options.emptyIcon }),
    },
    dialog: {
      showMessageBoxSync: (parent, settings) => {
        assert.equal(parent, win);
        assert.equal(settings.defaultId, 0);
        assert.equal(settings.cancelId, 0);
        return response;
      },
    },
    settingsFile: file,
    iconFile: "local.png",
  });
  return {
    app,
    win,
    file,
    created,
    lifecycle,
    setResponse: (value) => {
      response = value;
    },
  };
}
function event() {
  return {
    prevented: false,
    preventDefault() {
      this.prevented = true;
    },
  };
}
test("기본 X 종료 정책을 유지하고 옵트인만 숨기며 두 번째 실행은 창 복원", (t) => {
  const f = lifecycleFixture(t);
  const originalClose = event();
  f.win.emit("close", originalClose);
  assert.equal(originalClose.prevented, false);
  assert.throws(() => f.lifecycle.setCloseToTray("true"));
  assert.equal(f.lifecycle.setCloseToTray(true).closeToTray, true);
  assert.equal(readSettings(f.file).closeToTray, true);
  const close = event();
  f.win.emit("close", close);
  assert.equal(close.prevented, true);
  assert.equal(f.win.visible, false);
  f.win.minimized = true;
  f.app.emit("second-instance");
  assert.equal(f.win.visible, true);
  assert.equal(f.win.minimized, false);
  assert.equal(f.win.focused, true);
  f.win.visible = false;
  f.created[0].menu.find((item) => item.label === "열기").click();
  assert.equal(f.win.visible, true);
  f.lifecycle.setCloseToTray(false);
  assert.equal(f.created[0].destroyed, true);
  assert.equal(f.lifecycle.getSettings().closeToTray, false);
});
test("트레이 생성·아이콘 실패와 설정 쓰기 실패에서는 창을 유지", (t) => {
  for (const options of [
    { failTray: true },
    { emptyIcon: true },
    { failTray: true, enabled: true },
  ]) {
    const f = lifecycleFixture(t, options);
    assert.equal(f.lifecycle.setCloseToTray(true).closeToTray, false);
    assert.equal(f.lifecycle.getSettings().trayAvailable, false);
    assert.ok(f.lifecycle.getSettings().message);
    const close = event();
    f.win.emit("close", close);
    assert.equal(close.prevented, false);
    assert.equal(f.win.visible, true);
  }
  const f = lifecycleFixture(t);
  fs.mkdirSync(f.file + ".tmp");
  assert.equal(f.lifecycle.setCloseToTray(true).closeToTray, false);
  assert.equal(f.created[0].destroyed, true);
  assert.equal(f.win.visible, true);
  const enabled = lifecycleFixture(t, { enabled: true });
  enabled.win.visible = false;
  fs.mkdirSync(enabled.file + ".tmp");
  const unchanged = enabled.lifecycle.setCloseToTray(false);
  assert.equal(unchanged.closeToTray, true);
  assert.equal(unchanged.trayAvailable, true);
  assert.equal(enabled.win.visible, true);
  assert.equal(readSettings(enabled.file).closeToTray, true);
});
test("트레이 종료는 unload 보호를 거치며 취소 후 숨김 정책을 복구", (t) => {
  const f = lifecycleFixture(t);
  f.lifecycle.setCloseToTray(true);
  f.created[0].menu.find((item) => item.label === "종료").click();
  const quitClose = event();
  f.win.emit("close", quitClose);
  assert.equal(quitClose.prevented, false);
  const cancelledUnload = event();
  f.win.webContents.emit("will-prevent-unload", cancelledUnload);
  assert.equal(cancelledUnload.prevented, false);
  assert.equal(f.win.visible, true);
  const afterCancel = event();
  f.win.emit("close", afterCancel);
  assert.equal(afterCancel.prevented, true);
  f.setResponse(1);
  f.app.quit();
  const approvedUnload = event();
  f.win.webContents.emit("will-prevent-unload", approvedUnload);
  assert.equal(approvedUnload.prevented, true);
  f.app.emit("will-quit");
  assert.equal(f.created[0].destroyed, true);
});

const now = Date.parse("2026-10-16T10:00:00+09:00");
const item = (id, offset, done = false) => ({
  id,
  title: id,
  at: new Date(now + offset).toISOString(),
  done,
});
test("일반 1분·복귀 24시간 알림은 경계·완료·미래·중복 회차를 제외", () => {
  const recent = item("event:e:2026-10-16", -1000);
  const old = item("task:t", -3600000);
  const values = [
    recent,
    recent,
    old,
    item("future", 1),
    item("done", -1, true),
    item("boundary", -CATCHUP_WINDOW_MS),
    item("normal-boundary", -60000),
  ];
  assert.deepEqual(selectDue(values, now), [recent]);
  assert.deepEqual(
    selectDue(values, now, new Map(), "resume").map((e) => e.id),
    ["task:t", "normal-boundary", "event:e:2026-10-16"],
  );
  assert.deepEqual(
    selectDue(
      values,
      now,
      new Map([[receiptKey(recent), Date.parse(recent.at)]]),
    ),
    [],
  );
  assert.equal(
    selectDue(
      [
        {
          ...recent,
          at: new Date(now - 1000).toISOString().replace(".000Z", "Z"),
        },
      ],
      now,
      new Map([[receiptKey(recent), now]]),
    ).length,
    0,
  );
});
test("복귀 알림 이력은 업무 자료와 분리해 재실행 중복을 막고 오래된 이력을 정리", (t) => {
  const file = path.join(workspace(t), "notification-receipts.json");
  const a = item("a", -1000),
    b = item("b", -3600000);
  const receipts = new Map([
    [receiptKey(a), Date.parse(a.at)],
    ["expired", now - CATCHUP_WINDOW_MS],
  ]);
  assert.equal(pruneReceipts(receipts, now).has("expired"), false);
  writeReceipts(file, receipts, now);
  assert.deepEqual(
    readReceipts(file),
    new Map([[receiptKey(a), Date.parse(a.at)]]),
  );
  assert.deepEqual(selectDue([a, b], now, readReceipts(file), "resume"), [b]);
  fs.writeFileSync(file, '{"version":1,"receipts":[["key","bad"]]}');
  assert.throws(() => readReceipts(file));
});
test("알림 엔진은 많은 알림을 요약하고 반복 점검·재실행에서 중복 요청하지 않음", (t) => {
  const file = path.join(workspace(t), "notification-receipts.json");
  const rows = [0, 1, 2, 3, 4].map((n) => item(`event:${n}`, -(n + 1) * 1000));
  const sent = [];
  const options = {
    file,
    clock: () => now,
    readItems: () => rows,
    show: (message) => sent.push(message),
  };
  const notifier = createNotifier(options);
  assert.equal(notifier.check("resume").length, 5);
  assert.equal(sent.length, 1);
  assert.match(sent[0].body, /5건/);
  assert.equal(notifier.check().length, 0);
  assert.equal(createNotifier(options).check("resume").length, 0);
});
test("지원 불가·읽기 실패·표시 실패를 안전하게 처리하고 실패 알림은 재시도 가능", (t) => {
  const file = path.join(workspace(t), "notification-receipts.json");
  const logger = { error() {} };
  const base = {
    file,
    clock: () => now,
    readItems: () => [item("event:e", -1000)],
    logger,
  };
  assert.deepEqual(
    createNotifier({
      ...base,
      supported: () => false,
      show: () => assert.fail("unsupported"),
    }).check(),
    [],
  );
  assert.deepEqual(
    createNotifier({
      ...base,
      readItems: () => {
        throw new Error("corrupt workdesk");
      },
      show: () => assert.fail("bad data"),
    }).check(),
    [],
  );
  let count = 0;
  const notifier = createNotifier({
    ...base,
    show: (_, failed) => {
      count++;
      if (count === 1) throw new Error("OS failure");
      if (count === 2) failed();
    },
  });
  assert.equal(notifier.check().length, 0);
  assert.equal(notifier.check().length, 0);
  assert.equal(notifier.check().length, 1);
  assert.equal(notifier.check().length, 0);
  assert.equal(count, 3);
});

test("1시간 전 복귀 알림 실패는 일반 timer에서 재시도하고 오래된 실패 콜백을 무시", (t) => {
  const file = path.join(workspace(t), "notification-receipts.json");
  const old = item("event:old", -3600000);
  const callbacks = [];
  const notifier = createNotifier({
    file,
    clock: () => now,
    readItems: () => [old],
    show: (_, failed) => {
      callbacks.push(failed);
    },
  });
  assert.equal(notifier.check("resume").length, 1);
  callbacks[0]();
  assert.equal(notifier.check().length, 1);
  assert.equal(callbacks.length, 2);
  callbacks[0](); // Late duplicate failure from the first attempt cannot remove attempt two.
  assert.equal(readReceipts(file).has(receiptKey(old)), true);
  assert.equal(notifier.check().length, 0);
});
test("복귀 실패 후 완료·삭제·시각 변경·24시간 경과한 원본은 재시도하지 않음", (t) => {
  for (const changed of ["done", "deleted", "rescheduled", "expired"]) {
    const file = path.join(workspace(t), `notification-${changed}.json`);
    const old = item("event:old", -3600000);
    let rows = [old],
      currentNow = now,
      calls = 0;
    const notifier = createNotifier({
      file,
      clock: () => currentNow,
      readItems: () => rows,
      show: (_, failed) => {
        calls++;
        failed();
      },
    });
    assert.equal(notifier.check("resume").length, 0);
    if (changed === "done") rows = [{ ...old, done: true }];
    if (changed === "deleted") rows = [];
    if (changed === "rescheduled") rows = [item("event:old", 3600000)];
    if (changed === "expired") currentNow = now + CATCHUP_WINDOW_MS;
    assert.equal(notifier.check().length, 0);
    assert.equal(calls, 1);
    if (changed !== "expired") {
      rows = [old]; // Removed retry entries cannot come back just because an old row returns.
      assert.equal(notifier.check().length, 0);
    }
  }
});
