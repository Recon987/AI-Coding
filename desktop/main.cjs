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
} = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const store = require("./store.cjs");
const { briefing, reminderItems } = require("../shared/model.mjs");
const { createDesktopLifecycle } = require("./lifecycle.cjs");
const { createNotifier } = require("./notifications.cjs");
let win, file, timer;
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.whenReady().then(() => {
    if (process.platform === "win32")
      app.setAppUserModelId("local.park.workdesk");
    file = path.join(app.getPath("userData"), "workdesk.json");
    try {
      store.read(file);
      store.migrateFile(file);
    } catch {
      dialog.showErrorBox(
        "데이터 읽기 실패",
        "기존 데이터를 보호하기 위해 시작을 중단합니다. 사용자 데이터 폴더의 workdesk.json을 확인하세요.",
      );
      app.quit();
      return;
    }
    ipcMain.handle("load", () => store.read(file));
    ipcMain.handle("save", (_, data) => store.write(file, data));
    ipcMain.handle("choose-folder", async () => {
      const r = await dialog.showOpenDialog(win, {
        properties: ["openDirectory"],
      });
      return r.canceled ? null : r.filePaths[0];
    });
    ipcMain.handle("open-folder", async (_, id) => {
      const folder = store.read(file).folders.find((f) => f.id === id);
      if (!folder || !fs.statSync(folder.path).isDirectory())
        throw new Error("폴더를 찾을 수 없습니다.");
      const error = await shell.openPath(folder.path);
      if (error) throw new Error(error);
    });
    ipcMain.handle("export-briefing", async (_, date) => {
      const body = briefing(store.read(file), date);
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
    ipcMain.handle("backup", async () => {
      const r = await dialog.showSaveDialog(win, {
        defaultPath: "공원업무수첩-백업.json",
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!r.canceled && r.filePath) store.write(r.filePath, store.read(file));
    });
    ipcMain.handle("restore", async () => {
      const r = await dialog.showOpenDialog(win, {
        properties: ["openFile"],
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (r.canceled) return null;
      if (fs.statSync(r.filePaths[0]).size > 20 * 1024 * 1024)
        throw new Error("20MB 이하의 백업을 선택하세요.");
      const data = store.read(r.filePaths[0]);
      const answer = await dialog.showMessageBox(win, {
        type: "question",
        buttons: ["취소", "복원"],
        defaultId: 0,
        cancelId: 0,
        message:
          "현재 데이터를 백업 내용으로 교체할까요? 교체 전 데이터는 자동 보관됩니다.",
      });
      if (answer.response !== 1) return null;
      store.write(
        file + ".before-restore-" + Date.now() + ".json",
        store.read(file),
      );
      store.write(file, data);
      return data;
    });
    win = new BrowserWindow({
      width: 1360,
      height: 900,
      minWidth: 960,
      minHeight: 680,
      backgroundColor: "#f4f6f2",
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
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
    win.loadFile(path.join(__dirname, "../dist/index.html"));
    const notifications = new Set();
    const notifier = createNotifier({
      readItems: (now) => reminderItems(store.read(file), now),
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
  });
  app.on("window-all-closed", () => {
    clearInterval(timer);
    app.quit();
  });
}
