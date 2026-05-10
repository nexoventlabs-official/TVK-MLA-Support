import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In dev, /api/* is proxied to the local Express backend (port 5050) so the
// portal can run independently. In production builds, axios uses VITE_API_URL
// (set in Vercel) and skips the proxy entirely.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 1573,
    proxy: {
      '/api': {
        target: 'http://localhost:5050',
        changeOrigin: true,
      },
    },
  },
})
