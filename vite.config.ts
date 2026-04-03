import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Custom plugin to handle API routes before Vite's default middleware
function apiRoutesPlugin() {
  return {
    name: 'api-routes',
    configureServer(server: any) {
      server.middlewares.use('/api/dump-logs', (req: any, res: any, next: any) => {
        if (req.method === 'POST') {
          const handler = require('./api/dump-logs');
          handler(req, res);
        } else {
          next();
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiRoutesPlugin()],
  server: {
    host: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: [],
    globals: true,
  },
} as any)
