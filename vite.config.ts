import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  // Tell Vite to use the root index.html (not client/index.html)
  root: '.',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      components: path.resolve(__dirname, 'src/components'),
      pages: path.resolve(__dirname, 'src/pages'),
      lib: path.resolve(__dirname, 'src/lib'),
      hooks: path.resolve(__dirname, 'src/hooks'),
    },
  },
  build: {
    // Make the client build live in its own folder so it doesn't clash with the server build
    outDir: 'dist/client',
    emptyOutDir: true,
    rollupOptions: {
      // Explicitly tell Rollup/Vite what the HTML entry is
      input: path.resolve(__dirname, 'index.html'),
    },
  },
})
