import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { VitePWA } from 'vite-plugin-pwa'

const PWA_NAMES: Record<string, string> = {
  comma: 'comma connect',
  konik: 'konik connect',
  asius: 'asius connect',
  dev: 'asius connect',
}

const API_URLS: Record<string, string> = {
  comma: 'https://api.comma.ai',
  konik: 'https://api-konik-proxy.asius.ai',
  asius: 'https://api.asius.ai',
  dev: 'http://localhost:8080',
}
export default defineConfig(({ mode }) => {
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
          name: PWA_NAMES[mode] ?? 'comma connect',
          short_name: 'connect',
          description: 'manage your openpilot experience',
          background_color: '#131318',
          theme_color: '#131318',
          start_url: '/',
          id: '/',
        },
        pwaAssets: {
          config: `pwa-assets-${mode === 'dev' ? 'asius' : mode}.config.ts`,
        },
        workbox: {
          navigateFallback: '/index.html',
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: new RegExp(`^${API_URLS[mode] ?? API_URLS.asius}`),
              handler: 'NetworkFirst',
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
            },
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
