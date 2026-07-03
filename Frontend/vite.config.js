import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendOrigin = env.VITE_BACKEND_ORIGIN || 'http://localhost:5000'

  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: backendOrigin,
          changeOrigin: true,
          logLevel: 'debug'
        },
        '/uploads': {
          target: backendOrigin,
          changeOrigin: true,
          logLevel: 'debug'
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    }
  }
})
