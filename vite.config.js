import basicSsl from '@vitejs/plugin-basic-ssl';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/rov-tower-siege-ar/',
  plugins: [basicSsl()],
  server: {
    host: true
  }
});
