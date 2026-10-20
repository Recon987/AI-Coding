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
  chooseReferenceFile: () => ipcRenderer.invoke("choose-reference-file"),
  referenceStatus: (id) => ipcRenderer.invoke("reference-status", id),
  revealReference: (id) => ipcRenderer.invoke("reveal-reference", id),
  chooseFolder: () => ipcRenderer.invoke("choose-folder"),
  openFolder: (id) => ipcRenderer.invoke("open-folder", id),
  backup: (password) => ipcRenderer.invoke("backup", password),
  restore: () => ipcRenderer.invoke("restore"),
  // TASK-SECURITY-03: the password of the backup picked by restore().
  restorePassword: (password) => ipcRenderer.invoke("restore-password", password),
  restoreCancel: () => ipcRenderer.invoke("restore-cancel"),
  // TASK-SECURITY-02: storage encryption.
  securityStatus: () => ipcRenderer.invoke("security-status"),
  securityPrepare: () => ipcRenderer.invoke("security-prepare"),
  securityCancel: () => ipcRenderer.invoke("security-cancel"),
  securityEnable: (typed) => ipcRenderer.invoke("security-enable", typed),
  unlockInfo: () => ipcRenderer.invoke("unlock-info"),
  unlockTry: (text) => ipcRenderer.invoke("unlock-try", text),
  unlockQuit: () => ipcRenderer.invoke("unlock-quit"),
});
