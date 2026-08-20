import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env relative to the project root or resources path in production
const envPath = app.isPackaged 
  ? path.join(process.resourcesPath, '.env') 
  : path.join(__dirname, '../.env');

dotenv.config({ path: envPath });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hidden', // Sleek frameless look on Windows/macOS
    titleBarOverlay: {
      color: '#0d0d1a',
      symbolColor: '#00f0ff',
      height: 30
    }
  });

  // If we are in dev mode, load the Vite dev server, else load the built file
  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:8004');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
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
    if (text.startsWith("\`\`\`json")) {
        text = text.substring(7, text.length - 3).trim();
    } else if (text.startsWith("\`\`\`")) {
        text = text.substring(3, text.length - 3).trim();
    }
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini API Error:", error);
    // Fallback theme
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
