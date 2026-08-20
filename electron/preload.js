const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  generateVibeTheme: (request) => ipcRenderer.invoke('generate-vibe-theme', request)
});
