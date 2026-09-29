import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Dev-only: forward /api to vulnerabilities-api (uvicorn on :8000).
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
})
