const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowClose: () => ipcRenderer.send('window-close'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  getDefaultPath: () => ipcRenderer.invoke('get-default-path'),
  installApp: (options) => ipcRenderer.invoke('install-app', options),
  launchApp: (exePath) => ipcRenderer.send('launch-app', exePath),
  onInstallProgress: (callback) => ipcRenderer.on('install-progress', (event, data) => callback(data)),
  getInstallerMode: () => ipcRenderer.invoke('get-installer-mode'),
  uninstallApp: (targetDir) => ipcRenderer.invoke('uninstall-app', targetDir),
  onUninstallProgress: (callback) => ipcRenderer.on('uninstall-progress', (event, data) => callback(data)),
  splashComplete: () => ipcRenderer.send('splash-complete'),
  showOutro: () => ipcRenderer.send('show-outro'),
  outroComplete: () => ipcRenderer.send('outro-complete'),
  logClient: (msg) => ipcRenderer.send('log-client', msg),
});
