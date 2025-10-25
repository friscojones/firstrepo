import { defineConfig } from 'vite'

export default defineConfig({
  base: '/guess-the-sentence-game/',
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  server: {
    port: 3000,
    open: true
  }
})