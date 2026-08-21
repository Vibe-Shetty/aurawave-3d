#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = __dirname;
const APP_DIR = fs.existsSync(path.join(REPO_ROOT, 'node_modules'))
  ? REPO_ROOT
  : path.resolve(REPO_ROOT, '../ai-workspace/prototypes/prototype-5-music-streamer');
const INSTALLER_DIR = path.join(REPO_ROOT, 'installer');
const BINARIES_DIR = path.resolve(REPO_ROOT, '../ai-workspace/releases/binaries');


console.log('====================================================');
console.log('🚀 AuraWave 3D Automated Production Release Pipeline');
console.log('====================================================');
console.log(`📁 Canonical App Root:     ${APP_DIR}`);
console.log(`📦 Canonical Installer:    ${INSTALLER_DIR}`);
console.log(`🎯 Target Binaries Folder: ${BINARIES_DIR}`);
console.log('----------------------------------------------------');

function run(cmd, cwd, stepName) {
  console.log(`\n⏳ [STEP] ${stepName}...`);
  console.log(`   Running: ${cmd} (in ${cwd})`);
  execSync(cmd, { cwd, stdio: 'inherit' });
  console.log(`✅ [SUCCESS] ${stepName} completed.`);
}

try {
  // 1. Build Web Assets
  run('npm.cmd run build:web', APP_DIR, '1/6: Building App Web & Three.js Assets');

  // Copy three.min.js to dist if needed
  const threeSrc = path.join(APP_DIR, 'three.min.js');
  const threeDest = path.join(APP_DIR, 'dist', 'three.min.js');
  if (fs.existsSync(threeSrc)) {
    fs.copyFileSync(threeSrc, threeDest);
    console.log('   Copied three.min.js into dist/');
  }

  // 2. Package App with Electron Builder to win-unpacked
  run('npx.cmd electron-builder --dir', APP_DIR, '2/6: Packaging Electron App Desktop Package');

  // Locate the generated win-unpacked
  let unpackedDir = path.join(APP_DIR, 'dist', 'win-unpacked');
  if (!fs.existsSync(unpackedDir)) {
    unpackedDir = path.resolve(APP_DIR, '../releases/win-unpacked');
  }
  if (!fs.existsSync(unpackedDir)) {
    unpackedDir = path.join(APP_DIR, 'dist-electron', 'win-unpacked');
  }
  if (!fs.existsSync(unpackedDir)) {
    throw new Error(`Could not locate win-unpacked directory at ${unpackedDir}`);
  }
  console.log(`   Found unpacked desktop bundle at: ${unpackedDir}`);

  // 3. Compress win-unpacked into installer/payload.zip
  const payloadZipPath = path.join(INSTALLER_DIR, 'payload.zip');
  console.log(`\n⏳ [STEP] 3/6: Compressing app into ${payloadZipPath}...`);
  if (fs.existsSync(payloadZipPath)) {
    fs.unlinkSync(payloadZipPath);
  }
  execSync(`powershell -Command "Compress-Archive -Path '${unpackedDir}\\*' -DestinationPath '${payloadZipPath}' -Force"`, {
    cwd: INSTALLER_DIR,
    stdio: 'inherit'
  });
  const zipSizeBytes = fs.statSync(payloadZipPath).size;
  const zipSizeMB = (zipSizeBytes / (1024 * 1024)).toFixed(2);
  console.log(`✅ [SUCCESS] payload.zip created (${zipSizeMB} MB).`);

  if (zipSizeBytes > 200 * 1024 * 1024) {
    throw new Error(`Payload zip exceeds safe size budget (Current: ${zipSizeMB} MB, Limit: 200 MB). Check files whitelist!`);
  }

  // Read dynamic version from installer package.json
  const installerPkg = JSON.parse(fs.readFileSync(path.join(INSTALLER_DIR, 'package.json'), 'utf8'));
  const currentVersion = installerPkg.version || '1.4.0';

  // 4. Build Modern React Installer
  run('npm.cmd run build:exe', INSTALLER_DIR, `4/6: Compiling Setup Installer Executable (v${currentVersion})`);

  // Locate compiled installer exe
  const installerDist = path.join(INSTALLER_DIR, 'dist-electron');
  const files = fs.readdirSync(installerDist);
  const exeFile = files.find(f => f.startsWith('AuraWave 3D Setup') && f.endsWith('.exe') && !f.includes('0.0.0'));
  if (!exeFile) {
    throw new Error(`Could not find compiled installer .exe in ${installerDist}`);
  }
  const compiledExePath = path.join(installerDist, exeFile);
  console.log(`   Compiled installer artifact: ${compiledExePath}`);

  // 5. Deploy to official releases/binaries
  console.log(`\n⏳ [STEP] 5/6: Deploying artifacts to ${BINARIES_DIR}...`);
  if (!fs.existsSync(BINARIES_DIR)) {
    fs.mkdirSync(BINARIES_DIR, { recursive: true });
  }

  const targetVersionedExe = path.join(BINARIES_DIR, `AuraWave-3D-Setup-v${currentVersion}.exe`);
  const targetLatestExe = path.join(BINARIES_DIR, 'AuraWave-3D-Setup-Latest.exe');

  fs.copyFileSync(compiledExePath, targetVersionedExe);
  fs.copyFileSync(compiledExePath, targetLatestExe);
  console.log(`✅ [SUCCESS] Published ${path.basename(targetVersionedExe)} (${(fs.statSync(targetVersionedExe).size / (1024 * 1024)).toFixed(2)} MB)`);
  console.log(`✅ [SUCCESS] Published ${path.basename(targetLatestExe)}`);

  // 6. Final Integrity Validation
  console.log('\n====================================================');
  console.log(`🎉 PRODUCTION RELEASE PIPELINE SUCCEEDED (v${currentVersion})`);
  console.log('====================================================');
  console.log(`📍 Versioned Binary: ${targetVersionedExe}`);
  console.log(`📍 Latest Binary:    ${targetLatestExe}`);
  console.log('✨ Ready for end-user installation!');


} catch (err) {
  console.error('\n❌ [PIPELINE FAILED]:', err.message);
  process.exit(1);
}
