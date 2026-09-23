/// <reference types="vitest" />
import { defineConfig, configDefaults } from 'vitest/config'
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
    // Git worktrees live at .claude/worktrees/<name>/ — inside the repo, so
    // Vitest would otherwise collect each worktree's copy of the suite too.
    // Two copies of the same jsdom tests then race over shared globals like
    // window.location.hash and fail confusingly.
    exclude: [...configDefaults.exclude, '**/.claude/worktrees/**'],
  },
}))
