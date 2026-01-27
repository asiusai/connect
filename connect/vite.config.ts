import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { VitePWA } from 'vite-plugin-pwa'

const API_URLS = ['https://api.comma.ai', 'https://api-konik-proxy.asius.ai', 'https://api.asius.ai']

export default defineConfig(() => {
  return {
    optimizeDeps: {
      exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
    },
    plugins: [
      tailwindcss(),
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'asius connect',
          short_name: 'connect',
          description: 'manage your openpilot experience',
          background_color: '#131318',
          theme_color: '#131318',
          start_url: '/',
          id: '/',
        },
        pwaAssets: { config: `pwa-assets.config.ts` },
        workbox: {
          navigateFallback: '/index.html',
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
          runtimeCaching: [
            ...API_URLS.map((url) => ({
              urlPattern: new RegExp(`^${url}`),
              handler: 'NetworkFirst' as const,
              options: {
                cacheName: 'api-cache',
                networkTimeoutSeconds: 5,
                expiration: {
                  maxAgeSeconds: 24 * 60 * 60,
                  maxEntries: 100,
                },
                cacheableResponse: {
                  statuses: [200],
                },
              },
            })),
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts-stylesheets',
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                cacheableResponse: {
                  statuses: [0, 200],
                },
                expiration: {
                  maxAgeSeconds: 365 * 24 * 60 * 60,
                  maxEntries: 30,
                },
              },
            },
          ],
        },
      }),
    ],
    server: {
      port: 3000,
    },
    build: {
      target: 'esnext',
    },
    resolve: {
      alias: {
        '~': '/src',
      },
    },
  }
})
