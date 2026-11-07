import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const API_PROXY_TARGET = process.env.VITE_API_PROXY_TARGET || 'http://localhost:5000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react()
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: API_PROXY_TARGET,
        changeOrigin: true
      },
      '/uploads': {
        target: API_PROXY_TARGET,
        changeOrigin: true
      }
    }
  }
})
