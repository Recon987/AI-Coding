const {contextBridge,ipcRenderer} = require('electron');
contextBridge.exposeInMainWorld('workdesk', {
 load:()=>ipcRenderer.invoke('load'), save:data=>ipcRenderer.invoke('save',data),
 chooseFolder:()=>ipcRenderer.invoke('choose-folder'), openFolder:id=>ipcRenderer.invoke('open-folder',id),
 backup:()=>ipcRenderer.invoke('backup'), restore:()=>ipcRenderer.invoke('restore')
});
