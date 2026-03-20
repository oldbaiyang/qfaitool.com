import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
  },
  server: {
    port: 3000,
    open: false,
    proxy: {
      '/api/remove-bg': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // 关键：关闭 parseBody，让代理直接转发原始请求体
        selfHandleResponse: false,
      },
    },
  },
});
