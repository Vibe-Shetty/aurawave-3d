import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import fs from 'fs'
import path from 'path'

// Custom plugin to ensure preload script is 100% pure CommonJS for Electron
function copyPreloadPlugin() {
  return {
    name: 'copy-preload-cjs',
    closeBundle() {
      const src = path.resolve(__dirname, 'electron/preload.cjs');
      const distDir = path.resolve(__dirname, 'dist-electron');
      if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
      fs.copyFileSync(src, path.join(distDir, 'preload.cjs'));
      fs.copyFileSync(src, path.join(distDir, 'preload.js'));
      console.log('✓ Copied pure CommonJS preload script to dist-electron/preload.cjs and preload.js');
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.js',
      }
    ]),
    copyPreloadPlugin(),
    renderer(),
  ],
})
