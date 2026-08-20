import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  server: {
    port: 8004,
    strictPort: true, // Fail if 8003 is taken
    open: false,
  },
  build: {
    outDir: 'dist',
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'AuraWave 3D',
        short_name: 'AuraWave',
        description: 'Immersive audio-reactive 3D visualizer',
        theme_color: '#1a1a2e',
        background_color: '#0d0d1a',
        display: 'standalone',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});
