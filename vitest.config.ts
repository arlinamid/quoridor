import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    env: {
      VITE_SUPABASE_URL: 'https://vitest-project.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'vitest-anon-key',
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
