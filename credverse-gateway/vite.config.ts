import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Static hosts (GitHub Pages) require a base path of /<repo>/.
  // Set PAGES_BASE=credity or PAGES_BASE=credity-ops-dashboard at build time.
  base: process.env.PAGES_BASE ? `/${process.env.PAGES_BASE.replace(/^\/+|\/+$/g, '')}/` : '/',
  server: {
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5174',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
  },
})

