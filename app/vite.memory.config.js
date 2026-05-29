import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

const memoryMvpOnlyRoutes = () => ({
  name: 'memory-mvp-only-routes',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const pathname = req.url?.split(/[?#]/)[0];

      if (pathname === '/' || pathname === '/index.html') {
        res.statusCode = 302;
        res.setHeader('Location', '/memory-mvp.html');
        res.end();
        return;
      }

      if (pathname === '/custom-memory') {
        res.statusCode = 404;
        res.end('Use /memory-mvp.html for the memory MVP.');
        return;
      }

      next();
    });
  },
});

export default defineConfig({
  appType: 'mpa',
  plugins: [
    memoryMvpOnlyRoutes(),
    react(),
    tailwindcss(),
  ],
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      input: 'memory-mvp.html',
    },
  },
})
