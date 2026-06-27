/**
 * 程式化美術繪製（呈現層）— 匯總入口（barrel）。
 *
 * 實作依職責分檔；本檔僅 re-export 對外公開 API，維持既有 `from './sprites'` 引用路徑：
 * - spriteHelpers：顏色/材質/發光 helper + bgHash（確定性座標雜湊）
 * - spriteCast：drawPlayer / drawEnemy（角色與敵人造型）
 * - spriteEntities：drawGem / drawProjectile / drawOrbit / drawChest / drawPickup
 * - spriteBackground：drawBackgroundGrid / drawMapBackground / drawGarlicAura（地貌與場域）
 *
 * 每個繪製函式把某種 entity 的造型用 PixiJS Graphics 畫出（畫一次靜態幾何）；動畫（旋轉/脈動/
 * 閃白）由 PixiRenderer 以 transform 每幀套用。純繪製、不修改模擬狀態。
 */
export { bgHash } from './spriteHelpers'
export { drawPlayer, drawEnemy } from './spriteCast'
export { drawGem, drawProjectile, drawOrbit, drawChest, drawPickup } from './spriteEntities'
export { drawBackgroundGrid, drawMapBackground, drawGarlicAura } from './spriteBackground'
