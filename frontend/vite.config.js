import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl =
    process.env.VITE_API_URL !== undefined ? process.env.VITE_API_URL : env.VITE_API_URL

  // In production builds (vite build, mode production), enforce non-empty, non-localhost VITE_API_URL
  if (command === 'build' && mode === 'production') {
    if (!apiUrl || apiUrl.trim() === '') {
      throw new Error(
        'Production build failed: VITE_API_URL environment variable is required and cannot be empty. Please configure a valid production API URL (e.g. https://api.myaurevella.in).'
      )
    }

    const trimmedUrl = apiUrl.trim()
    const isLocalhost =
      trimmedUrl.includes('localhost') ||
      trimmedUrl.includes('127.0.0.1') ||
      trimmedUrl.includes('0.0.0.0')

    if (isLocalhost) {
      throw new Error(
        `Production build failed: VITE_API_URL cannot point to localhost in production ("${trimmedUrl}"). Please configure a valid production API URL (e.g. https://api.myaurevella.in).`
      )
    }

    if (!trimmedUrl.startsWith('https://')) {
      throw new Error(
        `Production build failed: VITE_API_URL must use HTTPS protocol in production ("${trimmedUrl}"). Insecure HTTP is not permitted.`
      )
    }
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            firebase: ['firebase/app', 'firebase/auth'],
          },
        },
      },
    },
  }
})
