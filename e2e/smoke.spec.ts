import { test, expect } from '@playwright/test'

/**
 * 關鍵流程煙霧測試（由 bdd 衍生）：
 * - 主選單渲染（角色/地圖/按鈕）
 * - 開始單人 → HUD 出現且固定步長迴圈推進（時間前進）
 * - 暫停握手（ESC → 暫停選單 → 繼續 / 回主選單）
 * - 多人選單導航（不觸發真連線）
 * 升級握手、實際戰鬥結算由引擎單元測試覆蓋；真跨機多人需兩機實測。
 */

test.beforeEach(async ({ page }) => {
  await page.goto('./')
})

test('主選單渲染：角色/地圖/三按鈕', async ({ page }) => {
  await expect(page.getByRole('button', { name: '單人遊玩' })).toBeVisible()
  await expect(page.getByRole('button', { name: '多人遊玩' })).toBeVisible()
  await expect(page.getByRole('button', { name: '排行榜' })).toBeVisible()
  // 角色/地圖選擇卡至少各有一張
  await expect(page.locator('.card').first()).toBeVisible()
})

test('開始單人：HUD 出現且時間前進（迴圈運轉）', async ({ page }) => {
  await page.getByRole('button', { name: '單人遊玩' }).click()
  const time = page.locator('.hud .time')
  await expect(time).toBeVisible()
  await expect(time).toHaveText('0:00')
  // 等待固定步長迴圈推進；時間應離開 0:00
  await expect(time).not.toHaveText('0:00', { timeout: 5000 })
})

test('暫停握手：ESC 開暫停選單 → 繼續 → 回主選單', async ({ page }) => {
  await page.getByRole('button', { name: '單人遊玩' }).click()
  await expect(page.locator('.hud')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: '繼續' })).toBeVisible()
  await expect(page.getByRole('button', { name: '重新開始' })).toBeVisible()

  await page.getByRole('button', { name: '繼續' }).click()
  await expect(page.getByRole('button', { name: '繼續' })).toBeHidden()
  await expect(page.locator('.hud')).toBeVisible()

  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: '回主選單' }).click()
  await expect(page.getByRole('button', { name: '單人遊玩' })).toBeVisible()
})

test('多人選單導航：進入後可返回（不觸發真連線）', async ({ page }) => {
  await page.getByRole('button', { name: '多人遊玩' }).click()
  await expect(page.getByRole('heading', { name: '多人遊玩' })).toBeVisible()
  await expect(page.getByRole('button', { name: '建立房間' })).toBeVisible()
  // 只測導航返回，不按「建立房間」（會觸發 Playroom 真連線）
  await page.getByRole('button', { name: '返回' }).click()
  await expect(page.getByRole('button', { name: '單人遊玩' })).toBeVisible()
})
