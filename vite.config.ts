import { defineConfig } from 'vitest/config'

export default defineConfig({
  server: { port: 5174, open: false },
  test: {
    // core 是零 DOM 依赖的纯逻辑，不需要 jsdom
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
  },
})
