import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // The dev server runs in Termux and is opened in the phone's browser, which
    // is a different device on the network rather than localhost. Without host:
    // true, Vite only binds to 127.0.0.1 and the phone cannot reach it.
    host: true,
    port: 5173,
  },
});
