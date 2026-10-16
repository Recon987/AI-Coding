const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("workdesk", {
  getDesktopSettings: () => ipcRenderer.invoke("desktop-settings-get"),
  setCloseToTray: (value) =>
    ipcRenderer.invoke("desktop-settings-set-tray", value),
  exportBriefing: (date) => ipcRenderer.invoke("export-briefing", date),
  load: () => ipcRenderer.invoke("load"),
  save: (data) => ipcRenderer.invoke("save", data),
  chooseFolder: () => ipcRenderer.invoke("choose-folder"),
  openFolder: (id) => ipcRenderer.invoke("open-folder", id),
  backup: () => ipcRenderer.invoke("backup"),
  restore: () => ipcRenderer.invoke("restore"),
});
