import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// /api goes to the Node relay (../server), which holds the secret key.
const BFF = process.env.BFF_URL || 'http://localhost:8787';

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.PORT) || 5173,
    proxy: { '/api': { target: BFF, changeOrigin: true } },
  },
  preview: {
    proxy: { '/api': { target: BFF, changeOrigin: true } },
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
