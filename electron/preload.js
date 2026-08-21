const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  generateVibeTheme: (request) => ipcRenderer.invoke('generate-vibe-theme', request),
  searchMusic: (query) => ipcRenderer.invoke('search-music', query),
  resolveAudioStream: (videoId) => ipcRenderer.invoke('resolve-audio-stream', videoId),
  selectAudioFiles: () => ipcRenderer.invoke('select-audio-files'),
  logEvent: (payload) => ipcRenderer.invoke('log-event', payload),
  getLogPath: () => ipcRenderer.invoke('get-log-path'),
  openLogFolder: () => ipcRenderer.invoke('open-log-folder'),
  getServerPort: () => ipcRenderer.invoke('get-server-port'),
  playYouTube: (videoId) => ipcRenderer.invoke('play-youtube-audio', videoId),
  pauseYouTube: () => ipcRenderer.invoke('pause-youtube-audio'),
  resumeYouTube: () => ipcRenderer.invoke('resume-youtube-audio'),
  seekYouTube: (seconds) => ipcRenderer.invoke('seek-youtube-audio', seconds),
  setYouTubeVolume: (volume) => ipcRenderer.invoke('set-youtube-volume', volume),
  stopYouTube: () => ipcRenderer.invoke('stop-youtube-audio'),
  onYouTubeTimeUpdate: (callback) => {
    ipcRenderer.removeAllListeners('youtube-time-update');
    ipcRenderer.on('youtube-time-update', (_event, data) => callback(data));
  },
  onYouTubeEnded: (callback) => {
    ipcRenderer.removeAllListeners('youtube-ended');
    ipcRenderer.on('youtube-ended', () => callback());
  }
});
