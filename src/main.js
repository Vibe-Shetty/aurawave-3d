// AuraWave 3D Modular Application Entrypoint
import './state.js';
import './audio.js';
import { initUI } from './ui.js';
import './render.js';

// Automatically unregister any stale Service Worker caches from previous sessions
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (let registration of registrations) {
      registration.unregister();
    }
  });
  if ('caches' in window) {
    caches.keys().then(names => {
      for (let name of names) {
        caches.delete(name);
      }
    });
  }
}

// Initialize UI interactions, shortcuts, and waveform
initUI();

// Global unhandled error boundary
window.addEventListener('error', (e) => {
  console.warn("AuraWave 3D Warning:", e.error);
});
