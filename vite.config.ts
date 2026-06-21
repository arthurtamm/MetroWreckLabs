/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Project Pages serve under /<repo>/, so production assets must be
  // referenced from that sub-path. The dev server stays at root.
  base: command === 'build' ? '/MetroWreckLabs/' : '/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
}))
