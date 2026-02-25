import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5000,
    host: '0.0.0.0',
    hmr: {
      overlay: true,
      path: '/hot/vite-hmr',
      port: 6000,
      clientPort: 443,
      timeout: 30000,
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: [
      '2vyi1erf.function.coze-coding.bytedance.net',
      'function.coze-coding.bytedance.net',
      '.function.coze-coding.bytedance.net',
      'localhost',
      '.localhost',
    ],
  },
});
