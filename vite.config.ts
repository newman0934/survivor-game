/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/survivor-game/',
  // Vitest 只跑單元測試（src 內 *.test.ts）；e2e/ 的 *.spec.ts 由 Playwright 跑。
  test: {
    include: ['src/**/*.test.ts'],
  },
})
