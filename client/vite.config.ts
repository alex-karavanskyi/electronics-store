import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(
    mode,
    fileURLToPath(new URL('.', import.meta.url)),
    'VITE_'
  )
  const proxy = {
    '/api': {
      target: env.VITE_API_URL || 'http://127.0.0.1:3001',
      changeOrigin: true,
    },
  }
  return {
    plugins: [react()],
    build: {
      target: ['chrome107', 'edge107', 'firefox104', 'safari16'],
      rolldownOptions: {
        output: {
          codeSplitting: {
            // Cache the React runtime separately from application code.
            includeDependenciesRecursively: false,
            groups: [
              {
                name: 'react-vendor',
                test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              },
            ],
          },
        },
      },
    },
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: { port: 5173, strictPort: true, proxy },
    preview: { port: 4173, strictPort: true, proxy },
  }
})
