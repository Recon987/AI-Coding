const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("workdesk", {
  getDesktopSettings: () => ipcRenderer.invoke("desktop-settings-get"),
  setCloseToTray: (value) =>
    ipcRenderer.invoke("desktop-settings-set-tray", value),
  exportBriefing: (date) => ipcRenderer.invoke("export-briefing", date),
  exportForm: (request) => ipcRenderer.invoke("export-form", request),
  exportAxReport: (request) => ipcRenderer.invoke("export-ax-report", request),
  load: () => ipcRenderer.invoke("load"),
  takeNotice: () => ipcRenderer.invoke("take-notice"),
  save: (data) => ipcRenderer.invoke("save", data),
  chooseFolder: () => ipcRenderer.invoke("choose-folder"),
  openFolder: (id) => ipcRenderer.invoke("open-folder", id),
  backup: () => ipcRenderer.invoke("backup"),
  restore: () => ipcRenderer.invoke("restore"),
  // TASK-SECURITY-02: storage encryption.
  securityStatus: () => ipcRenderer.invoke("security-status"),
  securityPrepare: () => ipcRenderer.invoke("security-prepare"),
  securityCancel: () => ipcRenderer.invoke("security-cancel"),
  securityEnable: (typed) => ipcRenderer.invoke("security-enable", typed),
  unlockInfo: () => ipcRenderer.invoke("unlock-info"),
  unlockTry: (text) => ipcRenderer.invoke("unlock-try", text),
  unlockQuit: () => ipcRenderer.invoke("unlock-quit"),
});
