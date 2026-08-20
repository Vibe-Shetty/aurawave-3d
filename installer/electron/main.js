import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import AdmZip from 'adm-zip';
import { exec, execFile } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let splashWindow;
let outroWindow;
let pendingCleanupScript = null;

function isUninstallMode() {
  const isUninstallArgs = process.argv.join(' ').toLowerCase().includes('--uninstall');
  const isUninstallName = process.execPath.toLowerCase().includes('uninstall');
  return isUninstallArgs || isUninstallName;
}

function createWindows() {
  const isUninstall = isUninstallMode();

  // If in uninstall mode, launch wizard directly without the intro splash
  if (isUninstall) {
    mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      frame: false,
      transparent: true,
      resizable: false,
      center: true,
      show: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
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

  // 1. Frameless Transparent Splash Window (Expanded dimensions with edge fade)
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
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // 2. Main Installer Window (Preloaded in background)
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    transparent: true,
    resizable: false,
    center: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
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
  ipcMain.once('splash-complete', transitionToMain);
  setTimeout(transitionToMain, 4200);
}

app.whenReady().then(createWindows);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});



// Window controls
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-close', () => mainWindow?.close());

// Directory picker
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Installation Folder'
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// Default path
ipcMain.handle('get-default-path', () => {
  return path.join(app.getPath('home'), 'AppData', 'Local', 'AuraWave3D');
});

ipcMain.handle('get-installer-mode', () => {
  const isUninstallArgs = process.argv.join(' ').toLowerCase().includes('--uninstall');
  const isUninstallName = process.execPath.toLowerCase().includes('uninstall');
  return (isUninstallArgs || isUninstallName) ? 'uninstall' : 'install';
});

function createShortcut(targetPath, shortcutPath) {
  return new Promise((resolve, reject) => {
    // Generate a temporary VBS script to create the shortcut
    const vbsScript = `
      Set ws = CreateObject("WScript.Shell")
      Set shortcut = ws.CreateShortcut("${shortcutPath}")
      shortcut.TargetPath = "${targetPath}"
      shortcut.WindowStyle = 1
      shortcut.IconLocation = "${targetPath}, 0"
      shortcut.Save
    `;
    const vbsPath = path.join(app.getPath('temp'), 'create_shortcut.vbs');
    fs.writeFileSync(vbsPath, vbsScript);
    
    exec(`cscript //NoLogo "${vbsPath}"`, (error) => {
      try { fs.unlinkSync(vbsPath); } catch (e) {} // Cleanup
      if (error) reject(error);
      else resolve();
    });
  });
}

function registerAppInWindows(targetDir, exePath, uninstallPath) {
  return new Promise((resolve) => {
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
      if (i >= cmds.length) return resolve();
      execFile('reg.exe', cmds[i], (err) => {
        if (err) console.error("Reg Error: ", err);
        runCmd(i + 1);
      });
    };
    runCmd(0);
  });
}

function createUninstaller(targetDir) {
  const uninstallPath = path.join(targetDir, 'Uninstall AuraWave 3D.exe');
  
  // In dev mode, process.execPath is the electron binary. We don't want to copy that as an uninstaller
  // In prod, it's the actual packaged installer.
  if (!process.env.VITE_DEV_SERVER_URL) {
    const originalExe = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
    fs.copyFileSync(originalExe, uninstallPath);
  }
  
  return uninstallPath;
}

// Install logic
ipcMain.handle('install-app', async (event, { targetDir, createDesktopShortcut }) => {
  try {
    // 1. Locate the payload zip
    // In dev, it might be in an extra folder, in prod it's in resources.
    let payloadPath = path.join(process.resourcesPath, 'payload.zip');
    if (!fs.existsSync(payloadPath)) {
       // fallback for dev mode
       payloadPath = path.join(__dirname, '../../payload.zip');
    }

    if (!fs.existsSync(payloadPath)) {
      throw new Error(`Payload not found at ${payloadPath}`);
    }

    // 2. Kill any running instances to prevent EBUSY locks
    event.sender.send('install-progress', { status: 'Preparing installation...', percent: 5 });
    await new Promise((resolve) => {
      exec('taskkill /F /IM "AuraWave 3D.exe" /T', () => resolve());
    });

    // 3. Ensure target directory exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // 4. Extract Zip
    event.sender.send('install-progress', { status: 'Extracting files...', percent: 10 });
    
    const originalNoAsar = process.noAsar;
    process.noAsar = true; // Disable Electron's asar interception so we can write .asar files

    try {
      const zip = new AdmZip(payloadPath);
      // Unpack everything synchronously (can be async but for 100MB sync is okay)
      zip.extractAllTo(targetDir, true);
    } finally {
      process.noAsar = originalNoAsar; // Restore interception
    }
    
    // The zip was "win-unpacked", so the exe is inside targetDir/win-unpacked/AuraWave 3D.exe
    // Let's assume we extract its contents directly. Actually electron-builder zip puts everything in the root of the zip.
    const exePath = path.join(targetDir, 'AuraWave 3D.exe');

    event.sender.send('install-progress', { status: 'Creating shortcuts...', percent: 80 });

    // 4. Create Desktop Shortcut
    if (createDesktopShortcut) {
      const desktopPath = path.join(app.getPath('desktop'), 'AuraWave 3D.lnk');
      await createShortcut(exePath, desktopPath);
    }
    
    // 5. Create Start Menu Shortcut (always good practice)
    const startMenuPath = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'AuraWave 3D.lnk');
    try {
      await createShortcut(exePath, startMenuPath);
    } catch(e) {
      console.warn("Could not create start menu shortcut", e);
    }

    event.sender.send('install-progress', { status: 'Registering application...', percent: 90 });
    
    // 6. Create Uninstaller & Register with Windows
    const uninstallPath = createUninstaller(targetDir);
    await registerAppInWindows(targetDir, exePath, uninstallPath);

    event.sender.send('install-progress', { status: 'Installation Complete!', percent: 100 });
    return { success: true, exePath };

  } catch (err) {
    console.error(err);
    return { success: false, error: err.message };
  }
});

// Launch app and exit installer
ipcMain.on('launch-app', (event, exePath) => {
  exec(`"${exePath}"`, (error) => {
    if (error) console.error("Failed to launch app:", error);
  });
  app.quit();
});

ipcMain.on('show-outro', () => {
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
      preload: path.join(__dirname, 'preload.js'),
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
      exec(`start /b cmd.exe /c "${pendingCleanupScript}"`);
    }
    app.quit();
  };

  ipcMain.once('outro-complete', finishOutro);
  setTimeout(finishOutro, 4200);
});

ipcMain.handle('uninstall-app', async (event, targetDir) => {
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

    event.sender.send('uninstall-progress', { status: 'Removing files...', percent: 80 });
    
    // Create detached cleanup batch file
    const cleanupScriptPath = path.join(app.getPath('temp'), 'aurawave_cleanup.bat');
    const batScript = `@echo off
timeout /t 2 /nobreak >nul
rmdir /s /q "${targetDir}"
del "%~f0"
`;
    fs.writeFileSync(cleanupScriptPath, batScript);
    pendingCleanupScript = cleanupScriptPath;
    
    event.sender.send('uninstall-progress', { status: 'Finalizing...', percent: 100 });
    
    return { success: true };
  } catch(e) {
    console.error(e);
    return { success: false, error: e.message };
  }
});

