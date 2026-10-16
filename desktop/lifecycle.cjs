const { loadSettings, writeSettings } = require("./settings.cjs");

function createDesktopLifecycle({
  app,
  win,
  Tray,
  Menu,
  nativeImage,
  dialog,
  settingsFile,
  iconFile,
}) {
  const loaded = loadSettings(settingsFile);
  let settings = loaded.settings;
  let message = loaded.message;
  let tray = null;
  let quitting = false;
  const hasTray = () => tray !== null && !tray.isDestroyed();
  function showWindow() {
    if (win.isDestroyed()) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  }
  function removeTray() {
    if (hasTray()) tray.destroy();
    tray = null;
  }
  function ensureTray() {
    if (hasTray()) return;
    let created;
    try {
      const icon = nativeImage.createFromPath(iconFile);
      if (icon.isEmpty()) throw new Error("트레이 아이콘을 읽지 못했습니다.");
      created = new Tray(icon);
      created.setToolTip("공원 업무 수첩");
      created.setContextMenu(
        Menu.buildFromTemplate([
          { label: "열기", click: showWindow },
          { type: "separator" },
          { label: "종료", click: () => app.quit() },
        ]),
      );
      created.on("click", showWindow);
      created.on("double-click", showWindow);
      if (created.isDestroyed()) throw new Error("트레이를 만들지 못했습니다.");
      tray = created;
    } catch (error) {
      if (created && !created.isDestroyed()) created.destroy();
      throw error;
    }
  }
  const status = () => ({ ...settings, trayAvailable: hasTray(), message });
  function setCloseToTray(value) {
    if (typeof value !== "boolean")
      throw new Error("트레이 설정은 켜기 또는 끄기만 가능합니다.");
    const previouslyAvailable = hasTray();
    try {
      if (value) ensureTray();
      // Commit the setting only after both resources and the file are ready.
      settings = writeSettings(settingsFile, {
        version: 1,
        closeToTray: value,
      });
      message = "";
      if (!value) {
        showWindow();
        removeTray();
      }
    } catch (error) {
      if (!previouslyAvailable) removeTray();
      showWindow();
      message = `설정을 변경하지 못했습니다. 창을 유지합니다. ${error.message}`;
    }
    return status();
  }
  if (settings.closeToTray) {
    try {
      ensureTray();
    } catch {
      settings = { version: 1, closeToTray: false };
      message =
        "트레이를 만들지 못해 창 닫기 시 종료하도록 시작했습니다. 창은 계속 표시됩니다.";
      showWindow();
    }
  }
  const beforeQuit = () => {
    quitting = true;
  };
  const close = (event) => {
    if (!quitting && settings.closeToTray && hasTray()) {
      event.preventDefault();
      win.hide();
    }
  };
  const preventUnload = (event) => {
    // Electron prevents unloading by default. Here preventDefault means discard and continue.
    showWindow();
    const answer = dialog.showMessageBoxSync(win, {
      type: "question",
      buttons: ["계속 작성", "변경을 버리고 종료"],
      defaultId: 0,
      cancelId: 0,
      noLink: true,
      message: "저장하지 않은 변경 사항이 있습니다. 종료할까요?",
      detail: "종료하면 입력 중인 내용은 저장되지 않습니다.",
    });
    if (answer === 1) event.preventDefault();
    else {
      quitting = false;
      showWindow();
    }
  };
  app.on("before-quit", beforeQuit);
  app.on("second-instance", showWindow);
  win.on("close", close);
  win.webContents.on("will-prevent-unload", preventUnload);
  app.on("will-quit", removeTray);
  return { getSettings: status, setCloseToTray, showWindow };
}
module.exports = { createDesktopLifecycle };
