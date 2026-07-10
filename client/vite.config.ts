import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Local dev: same-origin illusion — API + WS proxied to the game server.
    proxy: {
      '/auth': 'http://localhost:2567',
      '/api': 'http://localhost:2567',
      '/matchmake': 'http://localhost:2567',
    },
  },
});
