import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/backlog/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
      },
      manifest: {
        name: 'Backlog',
        short_name: 'Backlog',
        description: 'Track every game you have played.',
        theme_color: '#0A0B0F',
        background_color: '#0A0B0F',
        display: 'standalone',
        start_url: '/backlog/',
        scope: '/backlog/',
        icons: [
          { src: '/backlog/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/backlog/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
        ]
      }
    })
  ],
})