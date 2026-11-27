import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Panel de desarrollo (src/dev): en local y en las vistas previas de
 * Cloudflare (cualquier rama que no sea main). En la web publicada vale
 * false y el código ni se incluye.
 */
function devTools(mode: string): boolean {
  // loadEnv también lee las variables del entorno que empiezan por CF_PAGES (las pone Cloudflare al compilar).
  const env = loadEnv(mode, '.', 'CF_PAGES');
  return mode === 'development' || (env.CF_PAGES === '1' && env.CF_PAGES_BRANCH !== 'main');
}

export default defineConfig(({ mode }) => ({
  define: { __DEV_TOOLS__: JSON.stringify(devTools(mode)) },
  server: { host: true },
  build: {
    // Phaser ocupa ~1 MB; es normal y se cachea con el service worker.
    chunkSizeWarningLimit: 2000,
    // Cuatro entradas: el juego, /privacidad, /docentes y /baja (sin Phaser).
    rollupOptions: {
      input: {
        main: 'index.html',
        privacidad: 'privacidad.html',
        docentes: 'docentes.html',
        baja: 'baja.html',
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
        // /privacidad, /docentes y /baja son páginas propias: no se sustituyen por index.html.
        navigateFallbackDenylist: [/^\/privacidad/, /^\/docentes/, /^\/baja/],
      },
    }),
  ],
}));
