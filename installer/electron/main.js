import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import AdmZip from 'adm-zip';
import { exec, execFile } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Robust Multi-Destination Persistent File Logger
// ============================================================================
function getLogDestinations() {
  const targets = [];
  try {
    const appDataLogDir = path.join(app.getPath('home'), 'AppData', 'Local', 'AuraWave3D', 'logs');
    if (!fs.existsSync(appDataLogDir)) fs.mkdirSync(appDataLogDir, { recursive: true });
    targets.push(path.join(appDataLogDir, 'installer.log'));
  } catch {}
  try {
    const tempLogDir = path.join(app.getPath('temp'), 'AuraWave3D');
    if (!fs.existsSync(tempLogDir)) fs.mkdirSync(tempLogDir, { recursive: true });
    targets.push(path.join(tempLogDir, 'installer.log'));
  } catch {}
  return targets;
}

export function log(level, message, extra = null) {
  const timestamp = new Date().toISOString();
  let line = `[${timestamp}] [${level}] ${message}`;
  if (extra) {
    if (extra instanceof Error) {
      line += ` | Error: ${extra.message}\nStack: ${extra.stack}`;
    } else if (typeof extra === 'object') {
      try { line += ` | ${JSON.stringify(extra)}`; } catch { line += ` | [Object]`; }
    } else {
      line += ` | ${extra}`;
    }
  }
  line += '\n';

  console.log(line.trim());

  const destinations = getLogDestinations();
  for (const dest of destinations) {
    try {
      fs.appendFileSync(dest, line, 'utf8');
    } catch {}
  }
}

// Initial boot banner
log('INFO', '====================================================');
log('INFO', '🚀 AuraWave 3D Installer Process Started');
log('INFO', `Platform: ${process.platform} (${process.arch}) | Node: ${process.version} | Electron: ${process.versions.electron}`);
log('INFO', `Process ExecPath: ${process.execPath}`);
log('INFO', `Process CWD: ${process.cwd()}`);
log('INFO', `Process Resources: ${process.resourcesPath}`);
log('INFO', `CLI Arguments: ${JSON.stringify(process.argv)}`);
log('INFO', '====================================================');

process.on('uncaughtException', (err) => {
  log('FATAL', 'Uncaught Exception in Installer Main Process', err);
});

process.on('unhandledRejection', (reason) => {
  log('FATAL', 'Unhandled Promise Rejection in Installer Main Process', reason);
});

let mainWindow = null;
let splashWindow = null;
let outroWindow = null;
let pendingCleanupScript = null;

function isUninstallMode() {
  const isUninstallArgs = process.argv.join(' ').toLowerCase().includes('--uninstall');
  const isUninstallName = process.execPath.toLowerCase().includes('uninstall');
  return isUninstallArgs || isUninstallName;
}

function getPreloadPath() {
  const candidatePreloads = [
    path.join(__dirname, 'preload.cjs'),
    path.join(__dirname, 'preload.js'),
    path.join(app.getAppPath(), 'dist-electron', 'preload.cjs'),
    path.join(app.getAppPath(), 'dist-electron', 'preload.js'),
    path.join(process.resourcesPath, 'app.asar', 'dist-electron', 'preload.cjs'),
    path.join(process.resourcesPath, 'app.asar', 'dist-electron', 'preload.js'),
  ];
  for (const p of candidatePreloads) {
    if (fs.existsSync(p)) {
      log('DEBUG', `Resolved preload script path: ${p}`);
      return p;
    }
  }
  log('WARN', `Could not find existing preload, fallback to: ${path.join(__dirname, 'preload.cjs')}`);
  return path.join(__dirname, 'preload.cjs');
}

function createWindows() {
  const isUninstall = isUninstallMode();
  log('INFO', `createWindows called. Mode: ${isUninstall ? 'UNINSTALL' : 'INSTALL'}`);
  const preloadScript = getPreloadPath();

  // If in uninstall mode, launch wizard directly without the intro splash
  if (isUninstall) {
    mainWindow = new BrowserWindow({
      width: 840,
      height: 580,
      frame: false,
      transparent: true,
      resizable: false,
      center: true,
      show: true,
      webPreferences: {
        preload: preloadScript,
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    const devUrl = process.env.VITE_DEV_SERVER_URL;
    if (devUrl) {
      mainWindow.loadURL(devUrl);
    } else {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
    return;
  }

  // 1. Frameless Transparent Splash Window
  splashWindow = new BrowserWindow({
    width: 760,
    height: 620,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    center: true,
    hasShadow: false,
    show: true,
    webPreferences: {
      preload: preloadScript,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // 2. Main Installer Window (Preloaded in background)
  mainWindow = new BrowserWindow({
    width: 840,
    height: 580,
    frame: false,
    transparent: true,
    resizable: false,
    center: true,
    show: false,
    webPreferences: {
      preload: preloadScript,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    splashWindow.loadURL(`${devUrl}?view=splash`);
    mainWindow.loadURL(devUrl);
  } else {
    splashWindow.loadFile(path.join(__dirname, '../dist/index.html'), { query: { view: 'splash' } });
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  let transitioned = false;
  const transitionToMain = () => {
    if (transitioned) return;
    transitioned = true;
    log('INFO', 'Transitioning from Splash Window to Main Window');

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
  };

  // Transition when React animation sends complete event, or fallback timer
  ipcMain.once('splash-complete', () => {
    log('INFO', 'Received splash-complete event from frontend');
    transitionToMain();
  });
  setTimeout(transitionToMain, 4200);
}

app.whenReady().then(createWindows);

app.on('window-all-closed', () => {
  log('INFO', 'All windows closed. Quitting app.');
  if (process.platform !== 'darwin') app.quit();
});

// Client-side Log Hook
ipcMain.on('log-client', (event, msg) => {
  log('RENDERER', msg);
});

// Window controls
ipcMain.on('window-minimize', () => {
  log('INFO', 'Action: window-minimize triggered');
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.minimize();
  }
});

ipcMain.on('window-close', () => {
  log('INFO', 'Action: window-close triggered');
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
  }
  app.quit();
});

// Directory picker
ipcMain.handle('select-directory', async () => {
  log('INFO', 'Action: select-directory opened');
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Installation Folder'
  });
  if (result.canceled || result.filePaths.length === 0) {
    log('INFO', 'Directory selection canceled');
    return null;
  }
  log('INFO', `Directory selected: ${result.filePaths[0]}`);
  return result.filePaths[0];
});

// Default path
ipcMain.handle('get-default-path', () => {
  try {
    return path.join(app.getPath('home'), 'AppData', 'Local', 'AuraWave3D');
  } catch {
    return 'C:\\Users\\' + (process.env.USERNAME || 'User') + '\\AppData\\Local\\AuraWave3D';
  }
});

ipcMain.handle('get-installer-mode', () => {
  const isUninstallArgs = process.argv.join(' ').toLowerCase().includes('--uninstall');
  const isUninstallName = process.execPath.toLowerCase().includes('uninstall');
  return (isUninstallArgs || isUninstallName) ? 'uninstall' : 'install';
});

function createShortcut(targetPath, shortcutPath) {
  return new Promise((resolve) => {
    log('INFO', `Creating shortcut: ${shortcutPath} -> ${targetPath}`);
    try {
      const dir = path.dirname(shortcutPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const safeShortcut = shortcutPath.replace(/"/g, '""');
      const safeTarget = targetPath.replace(/"/g, '""');
      const safeWorkDir = path.dirname(targetPath).replace(/"/g, '""');

      const vbsScript = [
        'Set ws = CreateObject("WScript.Shell")',
        `Set sc = ws.CreateShortcut("${safeShortcut}")`,
        `sc.TargetPath = "${safeTarget}"`,
        `sc.WorkingDirectory = "${safeWorkDir}"`,
        'sc.WindowStyle = 1',
        `sc.IconLocation = "${safeTarget},0"`,
        'sc.Save'
      ].join('\r\n');

      const vbsPath = path.join(app.getPath('temp'), `sc_${Date.now()}_${Math.floor(Math.random()*1000)}.vbs`);
      fs.writeFileSync(vbsPath, vbsScript);
      
      exec(`cscript //NoLogo "${vbsPath}"`, (err) => {
        try { if (fs.existsSync(vbsPath)) fs.unlinkSync(vbsPath); } catch {}
        if (err) {
          log('WARN', `VBScript shortcut error: ${err.message}`);
        } else {
          log('INFO', `Shortcut created successfully: ${shortcutPath}`);
        }
        resolve();
      });
    } catch (e) {
      log('WARN', `Shortcut creation exception: ${e.message}`);
      resolve();
    }
  });
}

function registerAppInWindows(targetDir, exePath, uninstallPath) {
  return new Promise((resolve) => {
    log('INFO', 'Registering AuraWave 3D in Windows Registry');
    try {
      const regPath = `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\AuraWave3D`;
      
      const cmds = [
        ['ADD', regPath, '/v', 'DisplayName', '/d', 'AuraWave 3D', '/f'],
        ['ADD', regPath, '/v', 'DisplayIcon', '/d', `${exePath},0`, '/f'],
        ['ADD', regPath, '/v', 'UninstallString', '/d', `"${uninstallPath}" --uninstall`, '/f'],
        ['ADD', regPath, '/v', 'Publisher', '/d', 'AuraWave', '/f'],
        ['ADD', regPath, '/v', 'NoModify', '/t', 'REG_DWORD', '/d', '1', '/f'],
        ['ADD', regPath, '/v', 'NoRepair', '/t', 'REG_DWORD', '/d', '1', '/f']
      ];
      
      const runCmd = (i) => {
        if (i >= cmds.length) {
          log('INFO', 'Registry entries registered successfully');
          return resolve();
        }
        execFile('reg.exe', cmds[i], (err) => {
          if (err) log('WARN', `Registry command failed: ${cmds[i].join(' ')} | ${err.message}`);
          runCmd(i + 1);
        });
      };
      runCmd(0);
    } catch (err) {
      log('WARN', `Registry registration error: ${err.message}`);
      resolve();
    }
  });
}

function createUninstaller(targetDir) {
  const uninstallPath = path.join(targetDir, 'Uninstall AuraWave 3D.exe');
  log('INFO', `Creating uninstaller binary at: ${uninstallPath}`);
  
  if (!process.env.VITE_DEV_SERVER_URL) {
    try {
      const originalExe = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
      if (fs.existsSync(originalExe)) {
        fs.copyFileSync(originalExe, uninstallPath);
        log('INFO', `Copied uninstaller executable from ${originalExe}`);
      }
    } catch (e) {
      log('WARN', `Could not create uninstaller binary: ${e.message}`);
    }
  }
  
  return uninstallPath;
}

// ============================================================================
// Core High-Performance Non-Blocking Installation Engine
// ============================================================================
ipcMain.handle('install-app', async (event, { targetDir, createDesktopShortcut } = {}) => {
  log('INFO', '>>> install-app handler invoked');
  try {
    if (!targetDir) {
      targetDir = path.join(app.getPath('home'), 'AppData', 'Local', 'AuraWave3D');
    }
    log('INFO', `Resolved target installation directory: ${targetDir}`);

    // 1. Locate the payload zip
    const candidatePaths = [
      path.join(process.resourcesPath, 'payload.zip'),
      path.join(process.resourcesPath, 'app.asar.unpacked', 'payload.zip'),
      path.join(app.getAppPath(), 'payload.zip'),
      path.join(app.getAppPath(), '..', 'payload.zip'),
      path.join(__dirname, '../../payload.zip'),
      path.join(__dirname, '../payload.zip'),
      path.join(__dirname, 'payload.zip'),
      path.join(process.cwd(), 'payload.zip')
    ];

    let payloadPath = null;
    for (const p of candidatePaths) {
      const exists = fs.existsSync(p);
      log('DEBUG', `Checking candidate path [${exists ? 'FOUND' : 'NOT FOUND'}]: ${p}`);
      if (exists && !payloadPath) {
        payloadPath = p;
      }
    }

    if (!payloadPath) {
      const err = new Error(`Payload zip not found in any candidate path:\n${candidatePaths.join('\n')}`);
      log('FATAL', err.message);
      throw err;
    }

    log('INFO', `Using payload archive: ${payloadPath} (${(fs.statSync(payloadPath).size / 1024 / 1024).toFixed(2)} MB)`);

    // 2. Kill any running instances to prevent EBUSY locks
    event.sender.send('install-progress', { status: 'Preparing installation...', percent: 5 });
    log('INFO', 'Executing taskkill for running AuraWave 3D instances');
    await new Promise((resolve) => {
      let isDone = false;
      const t = setTimeout(() => {
        if (!isDone) { isDone = true; log('DEBUG', 'taskkill timeout reached (continuing)'); resolve(); }
      }, 2000);
      exec('taskkill /F /IM "AuraWave 3D.exe" /T', (err) => {
        if (!isDone) { 
          isDone = true; 
          clearTimeout(t); 
          log('DEBUG', `taskkill completed: ${err ? 'No active instances found or killed' : 'Process terminated'}`); 
          resolve(); 
        }
      });
    });

    // 3. Ensure target directory exists
    log('INFO', `Creating target directory: ${targetDir}`);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // 4. Non-Blocking Chunked Native Zip Extraction
    log('INFO', 'Starting fast, non-blocking archive extraction...');
    event.sender.send('install-progress', { status: 'Extracting application assets...', percent: 15 });

    const startTime = Date.now();
    const zip = new AdmZip(payloadPath);
    const entries = zip.getEntries();
    const totalEntries = entries.length;
    log('INFO', `Archive loaded with ${totalEntries} entries in ${Date.now() - startTime}ms`);

    let extractedCount = 0;
    for (let i = 0; i < totalEntries; i++) {
      const entry = entries[i];
      const entryPath = path.join(targetDir, entry.entryName);

      if (entry.isDirectory) {
        await fs.promises.mkdir(entryPath, { recursive: true });
      } else {
        await fs.promises.mkdir(path.dirname(entryPath), { recursive: true });
        const data = entry.getData();
        await fs.promises.writeFile(entryPath, data);
      }
      extractedCount++;

      const percent = Math.min(78, Math.round(15 + (extractedCount / totalEntries) * 63));
      event.sender.send('install-progress', { 
        status: `Unpacking: ${path.basename(entry.entryName)} (${extractedCount}/${totalEntries})`, 
        percent: percent 
      });

      // Yield event loop every 3 files to keep window message loop completely responsive
      if (i % 3 === 0 || entry.header.size > 5000000) {
        await new Promise(r => setImmediate(r));
      }
    }

    const extractionDuration = Date.now() - startTime;
    log('INFO', `Extraction completed: ${extractedCount} files written in ${extractionDuration}ms`);
    event.sender.send('install-progress', { status: 'Extraction complete.', percent: 78 });
    
    const exePath = path.join(targetDir, 'AuraWave 3D.exe');
    log('INFO', `Target executable location: ${exePath}`);

    event.sender.send('install-progress', { status: 'Creating shortcuts...', percent: 80 });

    // 5. Create Desktop Shortcut
    if (createDesktopShortcut !== false) {
      try {
        const desktopPath = path.join(app.getPath('desktop'), 'AuraWave 3D.lnk');
        await createShortcut(exePath, desktopPath);
      } catch (e) {
        log('WARN', `Desktop shortcut creation failed: ${e.message}`);
      }
    }
    
    // 6. Create Start Menu Shortcut
    try {
      const startMenuPath = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'AuraWave 3D.lnk');
      await createShortcut(exePath, startMenuPath);
    } catch(e) {
      log('WARN', `Start Menu shortcut creation failed: ${e.message}`);
    }

    event.sender.send('install-progress', { status: 'Registering application...', percent: 90 });
    
    // 7. Create Uninstaller & Register with Windows
    try {
      const uninstallPath = createUninstaller(targetDir);
      await registerAppInWindows(targetDir, exePath, uninstallPath);
    } catch (e) {
      log('WARN', `Windows registry registration failed: ${e.message}`);
    }

    log('INFO', '🎉 INSTALLATION COMPLETED SUCCESSFULLY!');
    event.sender.send('install-progress', { status: 'Installation Complete!', percent: 100 });
    return { success: true, exePath };

  } catch (err) {
    log('FATAL', `[INSTALL ERROR]: ${err.message}`, err);
    return { success: false, error: err.message };
  }
});

// Launch app and exit installer
ipcMain.on('launch-app', (event, exePath) => {
  log('INFO', `Action: launch-app requested for: ${exePath}`);
  exec(`"${exePath}"`, (error) => {
    if (error) log('ERROR', `Failed to launch app: ${error.message}`);
  });
  app.quit();
});

ipcMain.on('show-outro', () => {
  log('INFO', 'Action: show-outro triggered');
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
    mainWindow = null;
  }

  outroWindow = new BrowserWindow({
    width: 760,
    height: 620,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    center: true,
    hasShadow: false,
    show: true,
    webPreferences: {
      preload: getPreloadPath(),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    outroWindow.loadURL(`${devUrl}?view=outro`);
  } else {
    outroWindow.loadFile(path.join(__dirname, '../dist/index.html'), { query: { view: 'outro' } });
  }

  let outroDone = false;
  const finishOutro = () => {
    if (outroDone) return;
    outroDone = true;

    if (outroWindow && !outroWindow.isDestroyed()) {
      outroWindow.close();
      outroWindow = null;
    }

    if (pendingCleanupScript) {
      log('INFO', `Executing uninstaller cleanup script: ${pendingCleanupScript}`);
      exec(`start /b cmd.exe /c "${pendingCleanupScript}"`);
    }
    app.quit();
  };

  ipcMain.once('outro-complete', finishOutro);
  setTimeout(finishOutro, 4200);
});

ipcMain.handle('uninstall-app', async (event, targetDir) => {
  log('INFO', `>>> uninstall-app handler invoked for target: ${targetDir}`);
  try {
    event.sender.send('uninstall-progress', { status: 'Closing application...', percent: 10 });
    await new Promise((resolve) => {
      exec('taskkill /F /IM "AuraWave 3D.exe" /T', () => resolve());
    });

    event.sender.send('uninstall-progress', { status: 'Removing shortcuts & registry...', percent: 40 });
    // Remove registry
    const regPath = `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\AuraWave3D`;
    await new Promise(r => exec(`REG DELETE "${regPath}" /f`, () => r()));
    
    // Remove shortcuts
    try { fs.unlinkSync(path.join(app.getPath('desktop'), 'AuraWave 3D.lnk')); } catch(e){}
    try { fs.unlinkSync(path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'AuraWave 3D.lnk')); } catch(e){}

    event.sender.send('uninstall-progress', { status: 'Removing application & user data...', percent: 75 });
    
    // Resolve Roaming user profile directories (where Google tokens, session & onboarding flags reside)
    const roamingUserData1 = path.join(app.getPath('appData'), 'AuraWave 3D');
    const roamingUserData2 = path.join(app.getPath('appData'), 'aurawave-3d');
    const localUpdaterDir = path.join(app.getPath('home'), 'AppData', 'Local', 'aurawave-3d-updater');

    // Direct synchronous purge in Node if possible
    try { if (fs.existsSync(roamingUserData1)) fs.rmSync(roamingUserData1, { recursive: true, force: true }); } catch (e) { log('WARN', `Could not immediately rm ${roamingUserData1}: ${e.message}`); }
    try { if (fs.existsSync(roamingUserData2)) fs.rmSync(roamingUserData2, { recursive: true, force: true }); } catch (e) { log('WARN', `Could not immediately rm ${roamingUserData2}: ${e.message}`); }
    try { if (fs.existsSync(localUpdaterDir)) fs.rmSync(localUpdaterDir, { recursive: true, force: true }); } catch (e) { log('WARN', `Could not immediately rm ${localUpdaterDir}: ${e.message}`); }

    event.sender.send('uninstall-progress', { status: 'Cleaning remaining files...', percent: 90 });
    
    // Create detached cleanup batch file as secondary guarantee
    const cleanupScriptPath = path.join(app.getPath('temp'), 'aurawave_cleanup.bat');
    const batScript = `@echo off
timeout /t 2 /nobreak >nul
if exist "${targetDir}" rmdir /s /q "${targetDir}"
if exist "${roamingUserData1}" rmdir /s /q "${roamingUserData1}"
if exist "${roamingUserData2}" rmdir /s /q "${roamingUserData2}"
if exist "${localUpdaterDir}" rmdir /s /q "${localUpdaterDir}"
del "%~f0"
`;
    fs.writeFileSync(cleanupScriptPath, batScript);
    pendingCleanupScript = cleanupScriptPath;
    
    event.sender.send('uninstall-progress', { status: 'Finalizing...', percent: 100 });
    log('INFO', 'Uninstall sequence and user data purge completed successfully');
    return { success: true };
  } catch(e) {
    log('ERROR', `Uninstall failed: ${e.message}`, e);
    return { success: false, error: e.message };
  }
});
