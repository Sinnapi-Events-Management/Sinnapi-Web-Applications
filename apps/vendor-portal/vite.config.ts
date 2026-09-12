import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
    // Keep a single instance of React/Emotion/MUI when consuming the linked
    // @sinnapi/ui workspace package, otherwise styles/hooks break.
    dedupe: ['react', 'react-dom', '@emotion/react', '@emotion/styled', '@mui/material'],
  },
  server: {
    port: 3002,
    /**
     * Hostnames the dev server will answer to.
     *
     * Vite 5.4.12+ rejects any request whose Host header it does not
     * recognise — a DNS-rebinding defence — so a tunnelled request arrives as
     * `Blocked request. This host is not allowed.` before it reaches the app.
     * That matters here because PayPal cannot be tested against localhost at
     * all: it requires a publicly reachable HTTPS return_url and STALLS rather
     * than erroring on one it cannot reach, so the PayPal rail is only
     * exercisable through a tunnel (see supabase/functions/.env.example).
     *
     * A leading dot matches the domain and every subdomain, so these survive
     * the hostname changing on each tunnel restart. Only the tunnel providers
     * are listed rather than `true`, which would answer to any Host at all.
     */
    allowedHosts: [
      '.ngrok-free.app',
      '.ngrok-free.dev',
      '.ngrok.app',
      '.ngrok.io',
      '.trycloudflare.com',
    ],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          mui: ['@mui/material', '@mui/icons-material'],
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
});
