/**
 * 升級 system（leveling）。
 *
 * 定義經驗曲線（升一級所需經驗）、所有可選強化的清單（ALL_UPGRADES），以及升級時
 * 從清單中隨機抽出數張卡的邏輯（rollUpgrades）。純函式 + 純資料，無狀態。
 *
 * 在升級握手流程中的角色：當玩家經驗達到 xpForLevel 的門檻，World 觸發升級，迴圈暫停並用
 * rollUpgrades 抽出候選卡推給 store 供 UI 顯示；玩家選定後由 World.applyUpgrade 呼叫對應
 * UpgradeOption 的 apply() 修改 stats，再恢復遊戲。
 */
import type { UpgradeOption } from '../types'
import type { Rng } from '../core/rng'

/**
 * 經驗曲線：回傳從 (level-1) 升到 level 所需的經驗值總量。
 *
 * 設計意圖：採線性遞增，基礎 5 點、每級再 +5（即第 1 級 5、第 2 級 10、第 3 級 15…），
 * 讓前期升級頻繁、後期逐漸拉長，保持穩定的成長節奏。
 *
 * @param level 目標等級。
 * @returns 升到該等級所需的經驗值。
 */
export function xpForLevel(level: number): number {
  return 5 + (level - 1) * 5
}

/**
 * 所有可供抽選的強化選項清單。
 *
 * 每筆為一個 UpgradeOption：id（穩定識別字）、label（顯示給玩家的繁中文案）、
 * apply（就地修改 PlayerStats 的純函式）。乘法型強化採百分比累乘，加法型直接累加。
 *
 * 新增強化只要在此陣列加一筆，UI 與抽選邏輯會自動帶到（見 CLAUDE.md）。
 */
export const ALL_UPGRADES: UpgradeOption[] = [
  { id: 'damage', label: '傷害 +3', apply: (s) => { s.projectileDamage += 3 } },
  { id: 'firerate', label: '攻速 +15%', apply: (s) => { s.fireCooldown *= 0.85 } }, // 冷卻變短 = 攻速變快
  { id: 'movespeed', label: '移速 +12%', apply: (s) => { s.moveSpeed *= 1.12 } },
  { id: 'projspeed', label: '彈速 +20%', apply: (s) => { s.projectileSpeed *= 1.2 } },
  { id: 'pickup', label: '吸取範圍 +25%', apply: (s) => { s.pickupRadius *= 1.25 } },
]

/**
 * 從 ALL_UPGRADES 中不重複地隨機抽出指定數量的強化選項。
 *
 * 用於升級時產生「N 選 1」的卡片。為維持確定性，亂數一律走傳入的 seeded rng，
 * 不可使用 Math.random。透過複製池並逐次 splice 取出，確保同一輪不會抽到重複選項；
 * 若 count 超過可選數量，則最多回傳池內全部選項。
 *
 * @param rng   seeded 亂數產生器（確保可重現）。
 * @param count 想抽出的選項數量。
 * @returns 抽中的強化選項陣列（彼此不重複）。
 */
export function rollUpgrades(rng: Rng, count: number): UpgradeOption[] {
  const pool = [...ALL_UPGRADES] // 複製一份避免改動原清單
  const chosen: UpgradeOption[] = []
  while (chosen.length < count && pool.length > 0) {
    const i = Math.floor(rng.next() * pool.length)
    chosen.push(pool.splice(i, 1)[0]) // 取出後從池中移除，避免重複抽到
  }
  return chosen
}
