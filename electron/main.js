import { app, BrowserWindow, ipcMain, session, dialog, shell } from 'electron';
import path from 'path';
import http from 'http';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { Innertube, UniversalCache } from 'youtubei.js';

// Enable background audio and autoplay in Electron
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-features', 'AudioServiceOutOfProcess');

// Single Instance Lock (Enforce single app instance & focus existing window on relaunch)
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.exit(0);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set explicit app name
app.setName('AuraWave 3D');

// Set up Persistent File Logger with 7-Day Weekly Log Rotation
const logDir = path.join(app.getPath('userData'), 'logs');
if (!fs.existsSync(logDir)) {
  try { fs.mkdirSync(logDir, { recursive: true }); } catch (e) {}
}

const MAX_LOG_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 Days retention
const MAX_LOG_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB per file limit

function getTodayLogPath() {
  const dateStr = new Date().toISOString().slice(0, 10);
  return path.join(logDir, `aurawave-${dateStr}.log`);
}

const currentLogPath = path.join(logDir, 'aurawave.log');

export function cleanOldLogs() {
  try {
    if (!fs.existsSync(logDir)) return;
    const files = fs.readdirSync(logDir);
    const now = Date.now();
    for (const file of files) {
      if (file.startsWith('aurawave') && file.endsWith('.log')) {
        const filePath = path.join(logDir, file);
        try {
          const stats = fs.statSync(filePath);
          if (now - stats.mtimeMs > MAX_LOG_AGE_MS) {
            fs.unlinkSync(filePath);
          }
        } catch (e) {}
      }
    }
  } catch (err) {}
}

export function writeLog(level, category, message, data = null) {
  const timestamp = new Date().toISOString();
  let line = `[${timestamp}] [${level.toUpperCase()}] [${category}] ${message}`;
  if (data !== null && data !== undefined) {
    try {
      line += ` | ${typeof data === 'object' ? JSON.stringify(data) : String(data)}`;
    } catch (e) {
      line += ` | [Data serialization error]`;
    }
  }
  line += '\n';

  if (!app.isPackaged) {
    try {
      if (level === 'error') console.error(line.trim());
      else if (level === 'warn') console.warn(line.trim());
      else console.log(line.trim());
    } catch (e) {}
  }

  try {
    const todayLog = getTodayLogPath();
    fs.appendFileSync(todayLog, line, 'utf8');
    
    if (fs.existsSync(currentLogPath)) {
      const stats = fs.statSync(currentLogPath);
      if (stats.size > MAX_LOG_FILE_SIZE_BYTES) {
        fs.writeFileSync(currentLogPath, `[${timestamp}] [INFO] [LOGGER] Log rotated at 10MB limit.\n`, 'utf8');
      }
    }
    fs.appendFileSync(currentLogPath, line, 'utf8');
  } catch (err) {}
}

// Purge expired logs on startup and every 24 hours
cleanOldLogs();
setInterval(cleanOldLogs, 24 * 60 * 60 * 1000);

// Global Process Error Listeners
process.on('uncaughtException', (err) => {
  if (!err || err.code === 'EPIPE' || (err.message && err.message.includes('EPIPE'))) return;
  writeLog('ERROR', 'MAIN_PROCESS', `Uncaught Exception: ${err.message}`, { stack: err.stack });
});

process.on('unhandledRejection', (reason) => {
  if (reason && (reason.code === 'EPIPE' || String(reason).includes('EPIPE'))) return;
  writeLog('ERROR', 'MAIN_PROCESS', `Unhandled Rejection: ${String(reason)}`);
});

// Load .env relative to the project root or resources path in production
const envPath = app.isPackaged 
  ? path.join(process.resourcesPath, '.env') 
  : path.join(__dirname, '../.env');

dotenv.config({ path: envPath });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Singleton Innertube Instance for Direct Audio Stream Resolution
let innertubeInstance = null;
async function getInnertube() {
  if (!innertubeInstance) {
    try {
      innertubeInstance = await Innertube.create({
        cache: new UniversalCache(false),
        generate_session_locally: true
      });
      writeLog('INFO', 'INNERTUBE', 'Innertube YouTube Engine Initialized Successfully');
    } catch (err) {
      writeLog('ERROR', 'INNERTUBE', `Innertube initialization error: ${err.message}`);
      throw err;
    }
  }
  return innertubeInstance;
}

// Audio Stream URL Cache (4-Hour Expiration)
const audioStreamUrlCache = new Map();

async function resolveDirectAudioStreamUrl(videoId) {
  const cached = audioStreamUrlCache.get(videoId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.url;
  }

  const yt = await getInnertube();
  const response = await yt.actions.execute('/player', {
    videoId: videoId,
    client: 'IOS',
    parse: false
  });
  
  const data = response.data;
  const formats = (data.streamingData?.adaptiveFormats || [])
    .concat(data.streamingData?.formats || [])
    .filter(f => f.mimeType && f.mimeType.startsWith('audio/'));

  const bestAudio = formats.find(f => f.url);
  if (!bestAudio || !bestAudio.url) {
    throw new Error(`No direct audio stream URL available for video ${videoId}`);
  }

  audioStreamUrlCache.set(videoId, {
    url: bestAudio.url,
    expiresAt: Date.now() + 4 * 60 * 60 * 1000
  });

  writeLog('INFO', 'STREAM_RESOLVER', `Resolved direct audio for ${videoId}`, {
    title: data.videoDetails?.title,
    bitrate: bestAudio.bitrate,
    mimeType: bestAudio.mimeType
  });

  return bestAudio.url;
}

let mainWindow;
let localServer = null;
let activeServerPort = 8005;

function startProductionServer(distPath) {
  return new Promise((resolve, reject) => {
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.wav': 'audio/wav',
      '.mp3': 'audio/mpeg',
      '.ogg': 'audio/ogg',
      '.flac': 'audio/flac',
      '.aac': 'audio/aac',
      '.m4a': 'audio/mp4',
      '.mp4': 'video/mp4',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.ico': 'image/x-icon'
    };

    localServer = http.createServer(async (req, res) => {
      // Set CORS headers for all responses
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      // Handle client logger POST endpoint
      if (req.method === 'POST' && req.url === '/api/client-log') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            const payload = JSON.parse(body);
            writeLog('INFO', 'RENDERER', payload.type || 'LOG', payload.data);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok' }));
          } catch (e) {
            writeLog('WARN', 'RENDERER_LOG', 'Malformed JSON log', body);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'invalid json' }));
          }
        });
        return;
      }

      // Handle /stream-audio endpoint for direct YouTube audio streaming with HTTP 206 Partial Content
      if (req.url.startsWith('/stream-audio')) {
        try {
          const parsedUrl = new URL(req.url, `http://127.0.0.1:${activeServerPort}`);
          const videoId = parsedUrl.searchParams.get('id');
          if (!videoId) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            return res.end('Missing video ID');
          }

          const remoteUrl = await resolveDirectAudioStreamUrl(videoId);
          const fetchHeaders = {
            'User-Agent': 'com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X; US)'
          };
          if (req.headers.range) {
            fetchHeaders['Range'] = req.headers.range;
          }

          const remoteRes = await fetch(remoteUrl, { headers: fetchHeaders });
          
          const responseHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': remoteRes.headers.get('content-type') || 'audio/mp4',
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'no-cache'
          };

          if (remoteRes.headers.get('content-length')) {
            responseHeaders['Content-Length'] = remoteRes.headers.get('content-length');
          }
          if (remoteRes.headers.get('content-range')) {
            responseHeaders['Content-Range'] = remoteRes.headers.get('content-range');
          }

          res.writeHead(remoteRes.status, responseHeaders);

          if (remoteRes.body) {
            const reader = remoteRes.body.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(value);
            }
          }
          res.end();
          return;
        } catch (err) {
          writeLog('ERROR', 'STREAM_PROXY', `Proxy error: ${err.message}`);
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end(`Audio stream proxy error: ${err.message}`);
          return;
        }
      }

      // Handle /local-audio streaming endpoint for native desktop MP3 playback
      if (req.url.startsWith('/local-audio')) {
        try {
          const parsedUrl = new URL(req.url, `http://127.0.0.1:${activeServerPort}`);
          const targetPath = parsedUrl.searchParams.get('path');
          if (targetPath && fs.existsSync(targetPath)) {
            const stat = fs.statSync(targetPath);
            const ext = path.extname(targetPath).toLowerCase();
            const contentType = mimeTypes[ext] || 'audio/mpeg';

            const range = req.headers.range;
            if (range) {
              const parts = range.replace(/bytes=/, "").split("-");
              const start = parseInt(parts[0], 10);
              const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
              const chunksize = (end - start) + 1;
              const file = fs.createReadStream(targetPath, { start, end });
              res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${stat.size}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': contentType,
                'Cache-Control': 'no-cache'
              });
              file.pipe(res);
            } else {
              res.writeHead(200, {
                'Content-Length': stat.size,
                'Content-Type': contentType,
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'no-cache'
              });
              fs.createReadStream(targetPath).pipe(res);
            }
            return;
          } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File Not Found');
            return;
          }
        } catch (err) {
          writeLog('ERROR', 'LOCAL_AUDIO_STREAM', `Stream error: ${err.message}`);
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end(err.message);
          return;
        }
      }

      try {
        const parsedUrl = new URL(req.url, `http://127.0.0.1:${activeServerPort}`);
        let cleanPath = decodeURIComponent(parsedUrl.pathname);
        if (cleanPath === '/') cleanPath = '/index.html';
        
        let filePath = path.join(distPath, cleanPath);
        
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          filePath = path.join(distPath, 'index.html');
        }

        fs.readFile(filePath, (err, data) => {
          if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
            return;
          }
          const ext = path.extname(filePath).toLowerCase();
          const contentType = mimeTypes[ext] || 'application/octet-stream';
          res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache'
          });
          res.end(data);
        });
      } catch (e) {
        writeLog('ERROR', 'STATIC_SERVER', `Server error: ${e.message}`);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(e.message);
      }
    });

    const tryListen = (portToTry) => {
      const serverHandler = (err) => {
        if (err.code === 'EADDRINUSE') {
          if (portToTry === 8005) {
            localServer.removeListener('error', serverHandler);
            tryListen(4173);
            return;
          }
        }
        reject(err);
      };

      localServer.once('error', serverHandler);
      localServer.listen(portToTry, 'localhost', () => {
        localServer.removeListener('error', serverHandler);
        activeServerPort = portToTry;
        writeLog('INFO', 'HTTP_SERVER', `Internal production server listening on http://localhost:${portToTry}`);
        resolve(portToTry);
      });
    };

    tryListen(8005);
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      backgroundThrottling: false
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0d0d1a',
      symbolColor: '#00f0ff',
      height: 30
    }
  });

  // Enable F12 to toggle DevTools in both Dev and Production for debugging
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  mainWindow.on('closed', () => {
    if (bgAudioPoller) clearInterval(bgAudioPoller);
    if (bgAudioWindow && !bgAudioWindow.isDestroyed()) {
      bgAudioWindow.destroy();
      bgAudioWindow = null;
    }
    mainWindow = null;
    app.exit(0);
  });

  if (!app.isPackaged) {
    const distPath = fs.existsSync(path.join(__dirname, '../dist/index.html'))
      ? path.join(__dirname, '../dist')
      : path.join(__dirname, '..');
    try {
      const ping = await fetch('http://localhost:8005').catch(() => null);
      if (ping) {
        mainWindow.loadURL('http://localhost:8005');
      } else {
        const port = await startProductionServer(distPath);
        mainWindow.loadURL(`http://localhost:${port}`);
      }
    } catch (e) {
      mainWindow.loadURL('http://localhost:8005');
    }
    mainWindow.webContents.openDevTools();
  } else {
    const distPath = path.join(__dirname, '../dist');
    try {
      const port = await startProductionServer(distPath);
      mainWindow.loadURL(`http://localhost:${port}`);
    } catch (err) {
      writeLog('ERROR', 'STARTUP', `Production server failed, falling back to file protocol: ${err.message}`);
      mainWindow.loadFile(path.join(distPath, 'index.html'));
    }
  }
}

app.whenReady().then(() => {
  // Focus window if a second instance is launched
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Block advertising requests to ensure ad-free music playback
  const adBlockFilters = {
    urls: [
      '*://*.doubleclick.net/*',
      '*://*.googleads.g.doubleclick.net/*',
      '*://*.googlesyndication.com/*',
      '*://*.youtube.com/pagead/*',
      '*://*.youtube.com/api/stats/ads*',
      '*://*.youtube.com/get_midroll_info*',
      '*://*.youtube.com/ptracking*'
    ]
  };
  session.defaultSession.webRequest.onBeforeRequest(adBlockFilters, (details, callback) => {
    callback({ cancel: true });
  });

  // Spoof Referer & Origin to youtube.com for all YouTube embed / stream requests
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const url = details.url;
    if (url.includes('youtube.com') || url.includes('youtube-nocookie.com') || url.includes('googlevideo.com')) {
      details.requestHeaders['Referer'] = 'https://www.youtube.com/';
      details.requestHeaders['Origin'] = 'https://www.youtube.com';
      details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
    }
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = Object.assign({}, details.responseHeaders);
    delete responseHeaders['x-frame-options'];
    delete responseHeaders['X-Frame-Options'];
    delete responseHeaders['content-security-policy'];
    delete responseHeaders['Content-Security-Policy'];
    responseHeaders['access-control-allow-origin'] = ['*'];
    responseHeaders['access-control-allow-credentials'] = ['true'];
    callback({ cancel: false, responseHeaders });
  });

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (bgAudioPoller) clearInterval(bgAudioPoller);
  if (bgAudioWindow && !bgAudioWindow.isDestroyed()) {
    bgAudioWindow.destroy();
    bgAudioWindow = null;
  }
  app.exit(0);
});

// IPC Handler for Resolving Direct Audio Stream URLs
ipcMain.handle('resolve-audio-stream', async (event, videoId) => {
  if (!videoId) return null;
  try {
    const directUrl = await resolveDirectAudioStreamUrl(videoId);
    const streamProxyUrl = `http://127.0.0.1:${activeServerPort}/stream-audio?id=${encodeURIComponent(videoId)}`;
    return {
      streamUrl: streamProxyUrl,
      directUrl: directUrl
    };
  } catch (err) {
    writeLog('WARN', 'IPC_RESOLVE_STREAM', `Failed to resolve stream for ${videoId}: ${err.message}`);
    return null;
  }
});

// IPC Handler to Get Active Server Port
ipcMain.handle('get-server-port', () => {
  return activeServerPort;
});

// IPC Handler for Native Music Search
ipcMain.handle('search-music', async (event, query) => {
  if (!query) return [];
  try {
    const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const response = await fetch(ytUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    const html = await response.text();
    const match = html.match(/var ytInitialData = ({.*?});<\/script>/) || html.match(/ytInitialData\s*=\s*({.*?});/);
    if (match) {
      const ytData = JSON.parse(match[1]);
      const results = [];
      const contents = ytData.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];
      for (const item of contents) {
        const v = item.videoRenderer;
        if (v && v.videoId) {
          const title = v.title?.runs?.[0]?.text || 'Unknown Title';
          const author = v.ownerText?.runs?.[0]?.text || 'YouTube Music';
          const duration = v.lengthText?.simpleText || '3:30';
          const thumbnails = v.thumbnail?.thumbnails || [];
          const cover = thumbnails[thumbnails.length - 1]?.url || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`;
          const parts = duration.split(':').map(Number);
          let durationSec = 180;
          if (parts.length === 2) durationSec = parts[0] * 60 + parts[1];
          else if (parts.length === 3) durationSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
          results.push({
            id: `yt-${v.videoId}`,
            videoId: v.videoId,
            title,
            artist: author,
            genre: 'YouTube Music',
            cover,
            streamUrl: `http://127.0.0.1:${activeServerPort}/stream-audio?id=${v.videoId}`,
            duration: durationSec,
            durationStr: duration,
            isLive: false,
            isYouTube: true
          });
        }
      }
      return results.slice(0, 20);
    }
  } catch (err) {
    writeLog('ERROR', 'SEARCH_MUSIC', `Search error: ${err.message}`);
  }
  return [];
});

// IPC Handler for Gemini AI Vibe Generation
ipcMain.handle('generate-vibe-theme', async (event, { genre_or_mood, song_title }) => {
  const prompt = `
    Generate an immersive 3D audiovisual aesthetic theme for the music:
    Title: '${song_title || "Untitled Track"}', Mood/Genre: '${genre_or_mood}'.
    Return a clean JSON object with the following keys:
    - theme_name (string)
    - primary_color (hex code string, e.g. '#00f0ff')
    - secondary_color (hex code string, e.g. '#ff007f')
    - background_color (hex code string, e.g. '#07090e')
    - particle_speed (float between 0.5 and 2.5)
    - wave_intensity (float between 1.0 and 3.0)
    - poetic_vibe (a 2-sentence poetic description of this audio universe)
    - viral_tagline (a catchy 5-word tagline for social sharing)
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: "You are a creative digital art director and audio-reactive visual designer. Return ONLY valid JSON.",
        responseMimeType: "application/json"
      }
    });

    let text = response.text;
    if (text.startsWith("```json")) {
        text = text.substring(7, text.length - 3).trim();
    } else if (text.startsWith("```")) {
        text = text.substring(3, text.length - 3).trim();
    }
    return JSON.parse(text);
  } catch (error) {
    writeLog('WARN', 'AI_VIBE', `Gemini API fallback triggered: ${error.message}`);
    return {
      theme_name: `Cyberpunk ${genre_or_mood}`,
      primary_color: "#06b6d4",
      secondary_color: "#a855f7",
      background_color: "#07090e",
      particle_speed: 1.4,
      wave_intensity: 1.8,
      poetic_vibe: "Neon frequencies pulse through infinite space as rhythmic waves reshape the digital horizon.",
      viral_tagline: "Feel the Music in 3D",
      note: `Fallback theme loaded (Error: ${error.message})`
    };
  }
});

// IPC Handler for Native Local Audio File Picker
ipcMain.handle('select-audio-files', async () => {
  if (!mainWindow) return [];
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Audio Tracks (MP3, WAV, FLAC, OGG)',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'webm'] }
      ]
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return [];
    }

    const tracks = [];
    for (const filePath of result.filePaths) {
      try {
        const filename = path.basename(filePath);
        const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.')) || filename;
        const streamUrl = `http://127.0.0.1:${activeServerPort}/local-audio?path=${encodeURIComponent(filePath)}`;

        tracks.push({
          filePath: filePath,
          name: filename,
          title: nameWithoutExt,
          artist: 'Local Audio Track',
          genre: 'Local MP3',
          streamUrl: streamUrl,
          dataUrl: streamUrl,
          url: streamUrl,
          isLive: false
        });
      } catch (err) {
        writeLog('WARN', 'FILE_PICKER', `File path error: ${err.message}`, { filePath });
      }
    }
    writeLog('INFO', 'FILE_PICKER', `Selected ${tracks.length} local audio files`);
    return tracks;
  } catch (err) {
    writeLog('ERROR', 'FILE_PICKER', `Open file dialog error: ${err.message}`);
    return [];
  }
});

// IPC Handler for Renderer Log Events
ipcMain.handle('log-event', (event, { level, category, message, data }) => {
  writeLog(level || 'INFO', category || 'RENDERER', message, data);
  return true;
});

// IPC Handler to Retrieve Active Log File Path
ipcMain.handle('get-log-path', () => {
  return currentLogPath;
});

// IPC Handler to Open Log Folder in Windows File Explorer
ipcMain.handle('open-log-folder', () => {
  if (fs.existsSync(currentLogPath)) {
    shell.showItemInFolder(currentLogPath);
  } else {
    shell.openPath(logDir);
  }
  return true;
});

// ============================================================================
// Background YouTube Audio Engine (100% Reliable Native Audio Playback)
// ============================================================================
let bgAudioWindow = null;
let bgAudioPoller = null;

function getBackgroundAudioPlayer() {
  if (!bgAudioWindow || bgAudioWindow.isDestroyed()) {
    bgAudioWindow = new BrowserWindow({
      width: 640,
      height: 360,
      show: false, // COMPLETELY INVISIBLE BACKGROUND PLAYER
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false,
        backgroundThrottling: false,
        autoplayPolicy: 'no-user-gesture-required'
      }
    });

    const chromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
    bgAudioWindow.webContents.setUserAgent(chromeUA);

    bgAudioWindow.webContents.on('did-finish-load', () => {
      writeLog('INFO', 'BG_AUDIO', 'Background YouTube player loaded');
      bgAudioWindow.webContents.executeJavaScript(`
        (function() {
          // Dismiss consent popups
          const agreeBtn = Array.from(document.querySelectorAll('button, input[type="submit"]')).find(b => /accept|agree|i agree|got it|reject/i.test(b.innerText || b.getAttribute('aria-label') || ''));
          if (agreeBtn) agreeBtn.click();

          const mp = document.getElementById('movie_player');
          const v = document.querySelector('video');
          if (v) {
            v.muted = false;
            v.volume = 1.0;
          }
          if (mp && typeof mp.playVideo === 'function') {
            mp.playVideo();
          } else if (v && v.paused) {
            v.play().catch(() => {});
          }
        })()
      `).catch(() => {});
    });
  }
  return bgAudioWindow;
}

function startYouTubeAudioPolling() {
  if (bgAudioPoller) clearInterval(bgAudioPoller);
  bgAudioPoller = setInterval(async () => {
    if (!bgAudioWindow || bgAudioWindow.isDestroyed()) return;
    try {
      const state = await bgAudioWindow.webContents.executeJavaScript(`
        (function() {
          const mp = document.getElementById('movie_player');
          const v = document.querySelector('video');
          const isAd = mp && (mp.classList.contains('ad-showing') || mp.classList.contains('ad-interrupting'));
          const skipBtn = document.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, .videoAdUiSkipButton');

          // INSTANT AD ELIMINATOR
          if (isAd) {
            if (skipBtn) skipBtn.click();
            if (v && isFinite(v.duration) && v.duration > 0) {
              v.muted = true;
              v.playbackRate = 16.0;
              v.currentTime = v.duration;
            }
            return { isAd: true };
          }

          // Restore normal playback for the actual song
          if (v && v.muted) v.muted = false;
          if (v && v.playbackRate !== 1.0) v.playbackRate = 1.0;

          if (v) {
            const curTime = (mp && typeof mp.getCurrentTime === 'function') ? mp.getCurrentTime() : v.currentTime;
            const dur = (mp && typeof mp.getDuration === 'function') ? mp.getDuration() : v.duration;
            const pState = (mp && typeof mp.getPlayerState === 'function') ? mp.getPlayerState() : -1;
            const isPaused = (pState === 2) || (v.paused && pState !== 1 && pState !== 3);

            return {
              isAd: false,
              currentTime: curTime || 0,
              duration: dur || 0,
              paused: isPaused,
              ended: v.ended || pState === 0,
              volume: v.volume
            };
          }
          return null;
        })()
      `);

      if (state && !state.isAd && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('youtube-time-update', state);
        if (state.ended) {
          mainWindow.webContents.send('youtube-ended');
        }
      }
    } catch (e) {}
  }, 250);
}

ipcMain.handle('play-youtube-audio', async (event, videoId) => {
  if (!videoId) return { success: false, error: 'No video ID' };
  const player = getBackgroundAudioPlayer();
  const targetUrl = `https://www.youtube.com/watch?v=${videoId}`;
  writeLog('INFO', 'BG_AUDIO', `Loading background YouTube audio for ${videoId}: ${targetUrl}`);
  
  try {
    await player.loadURL(targetUrl);
    startYouTubeAudioPolling();
    return { success: true, videoId };
  } catch (err) {
    writeLog('ERROR', 'BG_AUDIO', `Failed to load YouTube watch page: ${err.message}`);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('pause-youtube-audio', async () => {
  if (bgAudioWindow && !bgAudioWindow.isDestroyed()) {
    try {
      await bgAudioWindow.webContents.executeJavaScript(`
        (function() {
          const mp = document.getElementById('movie_player');
          if (mp && typeof mp.pauseVideo === 'function') mp.pauseVideo();
          const v = document.querySelector('video');
          if (v) v.pause();
        })()
      `);
      return { success: true };
    } catch (e) {}
  }
  return { success: false };
});

ipcMain.handle('resume-youtube-audio', async () => {
  if (bgAudioWindow && !bgAudioWindow.isDestroyed()) {
    try {
      await bgAudioWindow.webContents.executeJavaScript(`
        (function() {
          const mp = document.getElementById('movie_player');
          const v = document.querySelector('video');
          if (v) v.muted = false;
          if (mp && typeof mp.playVideo === 'function') mp.playVideo();
          else if (v) v.play().catch(() => {});
        })()
      `);
      return { success: true };
    } catch (e) {}
  }
  return { success: false };
});

ipcMain.handle('seek-youtube-audio', async (event, seconds) => {
  if (bgAudioWindow && !bgAudioWindow.isDestroyed()) {
    try {
      await bgAudioWindow.webContents.executeJavaScript(`
        (function() {
          const target = ${Math.max(0, seconds)};
          const mp = document.getElementById('movie_player');
          if (mp && typeof mp.seekTo === 'function') mp.seekTo(target, true);
          const v = document.querySelector('video');
          if (v) v.currentTime = target;
        })()
      `);
      return { success: true };
    } catch (e) {}
  }
  return { success: false };
});

ipcMain.handle('set-youtube-volume', async (event, volume) => {
  if (bgAudioWindow && !bgAudioWindow.isDestroyed()) {
    const vol = Math.max(0, Math.min(1, volume));
    try {
      await bgAudioWindow.webContents.executeJavaScript(`
        (function() {
          const mp = document.getElementById('movie_player');
          if (mp && typeof mp.setVolume === 'function') mp.setVolume(${Math.round(vol * 100)});
          const v = document.querySelector('video');
          if (v) {
            v.volume = ${vol};
            v.muted = ${vol === 0};
          }
        })()
      `);
      return { success: true };
    } catch (e) {}
  }
  return { success: false };
});

ipcMain.handle('stop-youtube-audio', async () => {
  if (bgAudioPoller) clearInterval(bgAudioPoller);
  if (bgAudioWindow && !bgAudioWindow.isDestroyed()) {
    try {
      await bgAudioWindow.loadURL('about:blank');
    } catch (e) {}
  }
  return { success: true };
});

