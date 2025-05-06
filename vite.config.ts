import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { utcToZonedTime } from 'date-fns-tz';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
