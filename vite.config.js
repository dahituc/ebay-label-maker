import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: false, // Managed manually in public/manifest.json
      workbox: {
        // Cache-first for the app shell + static assets
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Runtime caching for Google Fonts
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxAgeSeconds: 60 * 60 * 24 * 365,
                maxEntries: 30
              }
            }
          }
        ],
        // Never cache Geoapify / Google address validation calls
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//]
      }
    })
  ],
  // base: './',
  base: '/ebay-label-maker/',
})

