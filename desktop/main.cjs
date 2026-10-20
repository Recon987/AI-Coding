const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  Notification,
  Tray,
  Menu,
  nativeImage,
  powerMonitor,
  safeStorage,
} = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const store = require("./store.cjs");
const { briefing, dayKey, reminderItems, NEWER_DATA_MESSAGE } = require("../shared/model.mjs");
const { buildForm } = require("../shared/forms.mjs");
const { buildAxReport } = require("../shared/ax-report.mjs");
const { createDesktopLifecycle } = require("./lifecycle.cjs");
const { createNotifier } = require("./notifications.cjs");
const { openDataFile } = require("./recovery.cjs");
const seal = require("./seal.cjs");
const keystore = require("./keystore.cjs");
const { osProtector } = require("./protector.cjs");
let win, file, timer;
const WEB_PREFERENCES = {
  preload: path.join(__dirname, "preload.cjs"),
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
};
const INDEX = path.join(__dirname, "../dist/index.html");
/**
 * TASK-SECURITY-02: a small window asking for the recovery key when this PC cannot open
 * the data key by itself. Resolves { ring, warning, window } or null (quit, nothing written
 * but a rewrapped key file). The window stays until the main window exists, so closing it
 * does not end the app half-way.
 */
function askRecoveryKey(state, protector) {
  return new Promise((resolve) => {
    const unlockWindow = new BrowserWindow({
      width: 620,
      height: 640,
      minWidth: 480,
      minHeight: 520,
      backgroundColor: "#f4f6f2",
      webPreferences: WEB_PREFERENCES,
    });
    unlockWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    unlockWindow.webContents.on("will-navigate", (e) => e.preventDefault());
    let done = false;
    const finish = (result) => {
      if (done) return;
      done = true;
      for (const channel of ["unlock-info", "unlock-try", "unlock-quit"]) ipcMain.removeHandler(channel);
      resolve(result && { ...result, window: unlockWindow });
    };
    ipcMain.handle("unlock-info", () => ({ reason: state.reason }));
    ipcMain.handle("unlock-try", (_, text) => {
      if (typeof text !== "string" || text.length > 200) throw new Error("복구 키를 확인하세요.");
      const opened = keystore.unlock({ state, recoveryKey: text, protector, store, dataFile: file });
      finish(opened);
      return true;
    });
    ipcMain.handle("unlock-quit", () => finish(null));
    unlockWindow.on("closed", () => finish(null));
    unlockWindow.loadFile(INDEX, { query: { view: "unlock" } });
  });
}
// A warning raised outside a renderer call (startup, restore), shown once after load.
let pendingNotice = "";
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.whenReady().then(async () => {
    if (process.platform === "win32")
      app.setAppUserModelId("local.park.workdesk");
    file = path.join(app.getPath("userData"), "workdesk.json");
    const notify = (text) => (pendingNotice = text);
    // TASK-SECURITY-02: open the data key before anything reads the data file.
    const protector = osProtector({ safeStorage, isPackaged: app.isPackaged });
    const security = keystore.loadState({ dataFile: file, protector });
    let unlockWindow = null;
    let securityNotice = "";
    if (security.status === "on") store.setSealer(security.ring);
    else if (security.status === "missing")
      securityNotice = `${security.reason} 이 상태에서는 저장이 암호화되지 않습니다. 자료 관리 > 저장 암호화에서 다시 켜세요. 손상된 키 파일은 지우지 않습니다.`;
    else if (security.status === "locked") {
      const unlocked = await askRecoveryKey(security, protector);
      if (!unlocked) {
        app.quit();
        return;
      }
      store.setSealer(unlocked.ring);
      unlockWindow = unlocked.window;
      securityNotice = unlocked.warning;
    }
    const opened = await openDataFile({ file, store, dialog, notify });
    if (!opened) {
      app.quit();
      return;
    }
    if (securityNotice) pendingNotice = [securityNotice, pendingNotice].filter(Boolean).join(" ");
    // TASK-SCHEMA-01: a newer app's file can be viewed; store.write() refuses to save it.
    const readOnly = opened === "read-only";
    const readData = () => store.read(file, { allowNewer: readOnly });
    ipcMain.handle("load", () => readData());
    ipcMain.handle("take-notice", () => {
      const text = pendingNotice;
      pendingNotice = "";
      return text;
    });
    const refuseWhenReadOnly = () => {
      if (readOnly) throw new Error(NEWER_DATA_MESSAGE);
    };
    ipcMain.handle("save", (_, data) => {
      refuseWhenReadOnly();
      return store.write(file, data, { keepLastGood: true });
    });
    // TASK-SECURITY-02: storage encryption status and the one-time turn-on with a recovery key.
    let pendingKeyring = null;
    const securityStatus = () => {
      if (store.sealerActive()) return { state: "on", keyFile: keystore.keyFilePath(file), test: Boolean(protector.test) };
      if (!protector.available) return { state: "unavailable", reason: protector.reason };
      return { state: "off", ...(security.status === "missing" ? { reason: security.reason } : {}) };
    };
    ipcMain.handle("security-status", () => securityStatus());
    ipcMain.handle("security-prepare", () => {
      refuseWhenReadOnly();
      const status = securityStatus();
      if (status.state !== "off") throw new Error(status.state === "on" ? "저장 암호화가 이미 켜져 있습니다." : status.reason);
      pendingKeyring = seal.createKeyring(protector);
      return { recoveryKey: pendingKeyring.recoveryKey };
    });
    ipcMain.handle("security-cancel", () => {
      pendingKeyring = null;
    });
    ipcMain.handle("security-enable", (_, typed) => {
      refuseWhenReadOnly();
      if (!pendingKeyring) throw new Error("복구 키를 먼저 만드세요.");
      if (seal.normalizeRecoveryKey(typed) !== seal.normalizeRecoveryKey(pendingKeyring.recoveryKey))
        throw new Error("입력한 복구 키가 보여 준 키와 다릅니다. 종이에 적은 키를 다시 확인하세요.");
      const made = pendingKeyring;
      const result = keystore.enable({ made, store, dataFile: file });
      pendingKeyring = null;
      return { ...securityStatus(), ...(result.warning ? { warning: result.warning } : {}) };
    });
    ipcMain.handle("choose-folder", async () => {
      const r = await dialog.showOpenDialog(win, {
        properties: ["openDirectory"],
      });
      return r.canceled ? null : r.filePaths[0];
    });
    ipcMain.handle("open-folder", async (_, id) => {
      const folder = readData().folders.find((f) => f.id === id);
      if (!folder || !fs.statSync(folder.path).isDirectory())
        throw new Error("폴더를 찾을 수 없습니다.");
      const error = await shell.openPath(folder.path);
      if (error) throw new Error(error);
    });
    ipcMain.handle("export-briefing", async (_, date) => {
      const body = briefing(readData(), date);
      const result = await dialog.showSaveDialog(win, {
        defaultPath: `업무브리핑-${date}.txt`,
        filters: [{ name: "텍스트", extensions: ["txt"] }],
      });
      if (result.canceled || !result.filePath) return false;
      fs.writeFileSync(result.filePath, "\ufeff" + body, {
        encoding: "utf8",
        mode: 0o600,
      });
      return true;
    });
    // The renderer only names the form and period; content comes from stored data.
    ipcMain.handle("export-form", async (_, request) => {
      if (
        !request ||
        typeof request !== "object" ||
        Object.keys(request).some(
          (key) => !["form", "startDate", "endDate", "format"].includes(key),
        )
      )
        throw new Error("양식 출력 요청을 확인하세요.");
      const { filename, content } = buildForm(readData(), request);
      const result = await dialog.showSaveDialog(win, {
        defaultPath: filename,
        filters:
          request.format === "csv"
            ? [{ name: "CSV (엑셀)", extensions: ["csv"] }]
            : [{ name: "텍스트", extensions: ["txt"] }],
      });
      if (result.canceled || !result.filePath) return false;
      fs.writeFileSync(result.filePath, "\ufeff" + content, {
        encoding: "utf8",
        mode: 0o600,
      });
      return true;
    });
    // TASK-AXDESK-03: the renderer names only the project and the format; the draft is
    // rebuilt here from the saved data with the same template as the preview.
    ipcMain.handle("export-ax-report", async (_, request) => {
      const { filename, content } = buildAxReport(readData(), request, dayKey());
      const result = await dialog.showSaveDialog(win, {
        defaultPath: filename,
        filters:
          request.format === "md"
            ? [{ name: "마크다운", extensions: ["md"] }]
            : [{ name: "텍스트", extensions: ["txt"] }],
      });
      if (result.canceled || !result.filePath) return false;
      // TXT keeps the BOM for older Notepad; Markdown tools read UTF-8 without it.
      fs.writeFileSync(result.filePath, (request.format === "md" ? "" : "\ufeff") + content, {
        encoding: "utf8",
        mode: 0o600,
      });
      return true;
    });
    ipcMain.handle("backup", async () => {
      refuseWhenReadOnly();
      const r = await dialog.showSaveDialog(win, {
        defaultPath: "공원업무수첩-백업.json",
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!r.canceled && r.filePath) store.write(r.filePath, store.read(file));
    });
    ipcMain.handle("restore", async () => {
      refuseWhenReadOnly();
      const r = await dialog.showOpenDialog(win, {
        properties: ["openFile"],
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (r.canceled) return null;
      if (fs.statSync(r.filePaths[0]).size > store.MAX_FILE_BYTES)
        throw new Error("20MB 이하의 백업을 선택하세요.");
      const data = store.read(r.filePaths[0], { required: true });
      // TASK-BACKUP-02: only the newest RESTORE_KEEP protection copies are kept;
      // the user is told which ones go before anything is replaced.
      // Listing is advisory: if the folder cannot be listed, restore still works and nothing is pruned.
      let copies = [];
      let listFailed = false;
      try {
        copies = store.restoreCopies(file);
      } catch {
        listFailed = true;
      }
      // The same rule the prune below applies, with the new copy (always newest) counted in,
      // so the prompt names exactly what will be deleted (BK-01).
      const newCopy = listFailed ? null : store.restoreCopyPath(file, Date.now(), copies);
      const goingAway = listFailed
        ? []
        : store.restoreCopiesToPrune([...copies, { file: newCopy, at: Infinity }], store.RESTORE_KEEP, [newCopy]);
      const stamp = (at) => {
        const d = new Date(at);
        const pad = (n) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      };
      const answer = await dialog.showMessageBox(win, {
        type: "question",
        buttons: ["취소", "복원"],
        defaultId: 0,
        cancelId: 0,
        message:
          "현재 데이터를 백업 내용으로 교체할까요? 교체 전 데이터는 자동 보관됩니다.",
        detail: [
          `복원 전 보호본은 최근 ${store.RESTORE_KEEP}개만 보관합니다.`,
          listFailed
            ? "보호본 목록을 확인하지 못해 이번에는 오래된 보호본을 정리하지 않습니다."
            : goingAway.length
            ? `복원하면 가장 오래된 보호본 ${goingAway.length}개(${goingAway.map((c) => stamp(c.at)).join(", ")})를 지웁니다. 필요하면 취소하고 먼저 다른 곳에 복사하세요.`
            : "",
        ].filter(Boolean).join("\n"),
      });
      if (answer.response !== 1) return null;
      const protectionCopy = newCopy ?? store.restoreCopyPath(file, Date.now(), []);
      store.write(protectionCopy, store.read(file));
      const saved = store.write(file, data, { keepLastGood: true });
      // The restore is committed from here on. Pruning may only warn: throwing now would
      // leave the renderer on pre-restore data and its next save would undo the restore
      // (DS-01, Codex data-safety audit 2026-10-19).
      let pruneWarning = "";
      if (!listFailed) {
        try {
          const pruned = store.pruneRestoreCopies(file, store.RESTORE_KEEP, [protectionCopy]);
          if (pruned.failed.length)
            pruneWarning = `오래된 복원 보호본 ${pruned.failed.length}개를 지우지 못했습니다. 저장 폴더 권한을 확인하세요.`;
        } catch (error) {
          pruneWarning = `복원은 완료했지만 오래된 복원 보호본을 정리하지 못했습니다(${error.message}). 보호본은 그대로 남아 있습니다.`;
        }
      }
      const warnings = [saved?.warning, pruneWarning].filter(Boolean);
      if (warnings.length) notify(warnings.join(" "));
      return data;
    });
    win = new BrowserWindow({
      width: 1360,
      height: 900,
      minWidth: 960,
      minHeight: 680,
      backgroundColor: "#f4f6f2",
      webPreferences: WEB_PREFERENCES,
    });
    // Closed only now, so window-all-closed never fires between the two windows.
    if (unlockWindow && !unlockWindow.isDestroyed()) unlockWindow.destroy();
    win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    win.webContents.on("will-navigate", (e) => e.preventDefault());
    const lifecycle = createDesktopLifecycle({
      app,
      win,
      Tray,
      Menu,
      nativeImage,
      dialog,
      settingsFile: path.join(app.getPath("userData"), "desktop-settings.json"),
      iconFile: path.join(__dirname, "assets/tray.png"),
    });
    ipcMain.handle("desktop-settings-get", () => lifecycle.getSettings());
    ipcMain.handle("desktop-settings-set-tray", (_, value) =>
      lifecycle.setCloseToTray(value),
    );
    win.loadFile(INDEX);
    const notifications = new Set();
    const notifier = createNotifier({
      readItems: (now) => reminderItems(readData(), now),
      file: path.join(app.getPath("userData"), "notification-receipts.json"),
      supported: () => Notification.isSupported(),
      show: (options, onFailure) => {
        const notification = new Notification(options);
        notifications.add(notification);
        notification.on("click", () => lifecycle.showWindow());
        notification.on("close", () => notifications.delete(notification));
        notification.on("failed", (_, error) => {
          notifications.delete(notification);
          onFailure();
          console.error("일정 알림 표시 실패:", error);
        });
        try {
          notification.show();
        } catch (error) {
          notifications.delete(notification);
          throw error;
        }
      },
    });
    notifier.check(); // Startup keeps the normal 60-second window; only resume catches up 24h.
    timer = setInterval(() => notifier.check(), 15000);
    const resume = () => notifier.check("resume");
    powerMonitor.on("resume", resume);
    app.on("will-quit", () => {
      clearInterval(timer);
      powerMonitor.removeListener("resume", resume);
      for (const notification of notifications) notification.close();
      notifications.clear();
    });
  }).catch((error) => {
    dialog.showErrorBox("시작 실패", `업무 자료를 보존한 상태에서 시작을 중단합니다. ${error.message}`);
    app.quit();
  });
  app.on("window-all-closed", () => {
    clearInterval(timer);
    app.quit();
  });
}
