import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright 設定：關鍵流程煙霧測試（由 BDD happy-path 衍生）。
 * 以 vite dev server 起站（base 為 /survivor-game/，故 baseURL 含該前綴）。
 * 僅測純前端流程（選單導航 / 開局 / 暫停握手）；真連線多人（Playroom）需兩機實測，不在此。
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173/survivor-game/',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173/survivor-game/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
