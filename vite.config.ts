import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api/v1': {
        target: 'http://122.163.121.176:3004',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/v1/, '/api/v1'),
      },
      '/ws': {
        target: 'ws://122.163.121.176:3004',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
