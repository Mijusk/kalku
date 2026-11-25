import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: { host: true },
  build: {
    // Phaser ocupa ~1 MB; es normal y se cachea con el service worker.
    chunkSizeWarningLimit: 2000,
    // Tres entradas: el juego, /privacidad y /docentes (sin Phaser).
    rollupOptions: {
      input: {
        main: 'index.html',
        privacidad: 'privacidad.html',
        docentes: 'docentes.html',
      },
    },
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Kalku',
        short_name: 'Kalku',
        description: 'Aventura de matemáticas para niños de 6 a 12 años',
        lang: 'es',
        theme_color: '#2f6b3a',
        background_color: '#1b2a1f',
        display: 'fullscreen',
        orientation: 'landscape',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // /privacidad y /docentes son páginas propias: no se sustituyen por index.html.
        navigateFallbackDenylist: [/^\/privacidad/, /^\/docentes/],
      },
    }),
  ],
});
