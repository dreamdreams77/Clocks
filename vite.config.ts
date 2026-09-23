import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Relative base so the built assets resolve correctly whether the site is served from a
  // domain root or a GitHub Pages project subpath (e.g. /clocklocks/).
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Wake & Wonder — Routine Clocks',
        short_name: 'Wake & Wonder',
        description: 'A magical wall of analog routine clocks for children: sleep, wake-up, and gentle countdowns to the things they are waiting for.',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1b1740',
        theme_color: '#2b2560',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
  },
});
