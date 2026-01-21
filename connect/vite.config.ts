import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { VitePWA } from 'vite-plugin-pwa'

// noinspection ES6PreferShortImport
import { Icons } from './src/components/Icon'

const PWA_NAMES: Record<string, string> = {
  comma: 'comma connect',
  konik: 'konik connect',
  asius: 'asius connect',
  dev: 'asius connect',
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
          navigateFallback: null,
          globPatterns: ['**/*.{js,css,ico,png,svg,webp}'],
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.mode === 'navigate',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'html-cache',
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
      {
        name: 'inject-material-symbols',
        transformIndexHtml(html) {
          const icons = Icons.toSorted().join(',')
          return {
            html,
            tags: [
              {
                tag: 'link',
                attrs: {
                  rel: 'stylesheet',
                  href: `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0..1,0&icon_names=${icons}&display=block`,
                },
                injectTo: 'head-prepend',
              },
            ],
          }
        },
      },
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
