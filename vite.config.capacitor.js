import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Separate build config for the Capacitor (Android) app.
// The web deploy (vite.config.js) uses base: '/leads-CRM/' for GitHub Pages;
// the native app serves assets from its own root, so base must be '/' here,
// and the PWA service-worker plugin is skipped (redundant inside a native WebView).
export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    outDir: 'dist-capacitor',
  },
})
