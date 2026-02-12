
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    // Ensuring process.env is handled robustly in the browser
    'process.env': {
      API_KEY: process.env.API_KEY || ''
    },
    'global': 'window', // Some libraries expect 'global' to exist
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './index.html'
      },
      // Ensure that we don't treat internal dependencies as external unless specified
      external: []
    },
    commonjsOptions: {
      include: [/node_modules/],
    }
  },
  server: {
    port: 3000
  },
  resolve: {
    alias: {
      '@': '/'
    }
  }
});
