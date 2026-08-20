# 🌊 AuraWave 3D — AI & Three.js Music Visualizer Experience

[![Release](https://img.shields.io/badge/Release-v1.3.0%20(Golden)-8b5cf6?style=for-the-badge&logo=github)](https://github.com/Vibe-Shetty/aurawave-3d/releases/latest)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL%203D-black?style=for-the-badge&logo=three.js)](https://threejs.org/)
[![Gemini](https://img.shields.io/badge/Google%20Gemini-3.6%20Flash-4285F4?style=for-the-badge&logo=google)](https://aistudio.google.com/)
[![Electron](https://img.shields.io/badge/Desktop-Electron%20App-47848F?style=for-the-badge&logo=electron)](https://www.electronjs.org/)
[![License](https://img.shields.io/badge/License-ISC-green?style=for-the-badge)](LICENSE)

An immersive, audio-reactive 3D web and desktop visualizer combining **Three.js WebGL particle physics**, real-time **Web Audio API FFT analysis**, and dynamic **Gemini 3.6 AI theme generation**.

---

## 🚀 Download for Windows (Standalone Installer)

Get the official standalone installer with 1-click desktop shortcuts and clean uninstall support:

👉 **[Download AuraWave 3D Setup v1.3.0 (.exe)](https://github.com/Vibe-Shetty/aurawave-3d/releases/download/v1.3.0/AuraWave-3D-Setup-v1.3.0.exe)**

---

## ✨ Features

- 🌌 **Real-Time 3D Particle Grid**: 6,400 audio-reactive vertices animated with custom Three.js shader physics, morphing geometries, and frequency ripples.
- 🎛️ **Web Audio API Frequency Engine**: Real-time Fast Fourier Transform (FFT) analysis mapping bass, mid, and treble bands directly to vertex displacement and color velocity.
- 🎹 **Procedural Algorithmic Synth Engine**: Built-in multi-genre algorithmic synthesizer that plays instantly without external audio files.
- 🤖 **Gemini 3.6 AI Dynamic Vibe Generator**: Real-time aesthetic adaptation — prompts Gemini AI to generate poetic atmospheres, particle velocities, color palettes, and motion dynamics on the fly.
- 🎵 **Full Media Transport & ID3 Parser**: Glassmorphic player controls with play/pause, seek ±10s, volume slider, playlist drawer, drag-and-drop audio uploading, and automatic ID3 metadata extraction (artist, album art, title).
- 🖥️ **Cross-Platform Web & Standalone Desktop App**: Run in any modern web browser or as a high-performance offline desktop application built with Electron.
- 📦 **Dual-Mode Setup / Uninstaller**: Built-in React 19 + Electron setup wizard with custom frameless window, automatic Start Menu / Desktop shortcuts, and Windows Registry integration.

---

## 🛠️ Quick Start Guide

### Option 1: Run the Web Version Locally

```bash
# 1. Clone the repository
git clone https://github.com/Vibe-Shetty/aurawave-3d.git
cd aurawave-3d

# 2. Install dependencies
npm install

# 3. Configure your Gemini API key (optional for AI vibe generation)
cp .env.example .env
# Edit .env and insert your free GEMINI_API_KEY from https://aistudio.google.com/

# 4. Start local development server
npm run dev
# Or run with Python server:
python server.py
```
Open your browser at **`http://localhost:8001`** (or Vite port).

---

### Option 2: Run as a Desktop App (Electron)

```bash
npm run start
```

---

### Option 3: Build the Standalone Setup Installer

```bash
# Build the web assets and package with Electron
npm run build:exe

# To build the custom dual-mode installer:
cd installer
npm install
npm run build:exe
```

---

## 📁 Repository Structure

```
aurawave-3d/
├── index.html             # Main visualizer WebGL entrypoint
├── visualizer.js          # Audio analysis & Three.js 3D particle engine
├── style.css              # Glassmorphic UI styling & animations
├── three.min.js           # Three.js library
├── server.py              # Local server & AI vibe proxy
├── electron/              # Electron desktop application main & preload scripts
├── installer/             # React 19 + Electron dual-mode setup/uninstall wizard
├── public/                # App icons, PWA manifests, and audio assets
├── src/                   # Core application modules
├── .env.example           # Environment template for Gemini API
└── package.json           # Scripts & dependency definitions
```

---

## 📜 License

This project is licensed under the ISC License.

---

### 👨‍💻 Created by [Karan Shetty (Vibe-Shetty)](https://github.com/Vibe-Shetty)
