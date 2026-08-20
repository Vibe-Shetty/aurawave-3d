// Import our modules
import './state.js';
import './audio.js';
import './ui.js'; 
import './render.js'; 

// PWA Service Worker Registration
import { registerSW } from 'virtual:pwa-register';
registerSW({ immediate: true });

// Global error handler just in case
window.addEventListener('error', (e) => {
    console.error("AuraWave 3D Error:", e.error);
});
