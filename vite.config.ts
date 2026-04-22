import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/app-icon.svg', 'icons/favicon.ico'],
      manifest: {
        name: 'Baisikkel Route Planner',
        short_name: 'Baisikkel',
        description: 'Bicycle route planner for Estonia',
        theme_color: '#16a34a',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'icons/pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: 'icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            // Routing API — NetworkFirst so fresh data is preferred; cached copy used offline
            urlPattern: ({ url }) => url.pathname.startsWith('/api/routes'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-routes-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24, // 24 h
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Map tiles and style JSON from openfreemap.org — StaleWhileRevalidate
            urlPattern: ({ url }) => url.hostname.includes('openfreemap.org'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'map-tiles-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // i18n translation files — CacheFirst; they only change on deploy
            urlPattern: ({ url }) => url.pathname.startsWith('/locales/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'i18n-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    })
  ]
})
