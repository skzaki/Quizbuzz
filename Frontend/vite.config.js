import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
],
optimizeDeps: {
    include: ['@mediapipe/face_mesh'],
  },
server: {
    host: true,
    port: 5178,
    allowedHosts: ['.ngrok-free.app'],
},
})
