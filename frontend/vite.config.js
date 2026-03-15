import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5176,
    host: true,
    allowedHosts: ['fuira.shop'],
    proxy: {
      '/api': {
        target: 'http://backend:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://backend:5000',
        ws: true,
      }
    }
  }
})
