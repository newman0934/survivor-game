/**
 * 玩家進度系統：經驗加成與升級、多人非阻塞升級待選流程。
 * 無狀態函式，操作傳入的 World 資料；升級選項走 World.upgradeRng（跨機一致）。
 */
import type { World } from '../World'
import type { PlayerState } from '../types'
import { xpForLevel, applyUpgradeById, rollUpgrades } from './leveling'

/** 多人非阻塞升級的待選逾時（秒）。 */
export const UPGRADE_TIMEOUT = 12

/**
 * 對指定玩家加經驗、必要時升級（per-player）。
 * 一次拾取可能跨越多個等級門檻，故用 while 迴圈把多餘經驗結算掉。
 */
export function grantXpTo(world: World, p: PlayerState, amount: number): void {
  p.xp += amount
  while (p.xp >= xpForLevel(p.level)) {
    p.xp -= xpForLevel(p.level)
    p.level += 1
    p.pendingLevelUps += 1
    world.pushSound('levelup')
  }
}

/**
 * 多人非阻塞升級處理（僅 playerCount>1 生效；單人沿用既有暫停握手）。
 * 為待升級玩家產生待選卡、倒數逾時、逾時自動選第一張。死亡玩家略過。
 */
export function processUpgrades(world: World, dt: number): void {
  if (world.playerCount <= 1) return
  for (const p of world.players) {
    if (!p.alive) continue
    if (!p.pendingOffer) {
      if (p.pendingLevelUps > 0) {
        p.pendingOffer = rollUpgrades(world.upgradeRng, 3, world.upgradeContextFor(p))
        p.upgradeTimer = UPGRADE_TIMEOUT
      }
    } else {
      p.upgradeTimer -= dt
      if (p.upgradeTimer <= 0) {
        applyUpgradeById(p.pendingOffer[0].id, world.upgradeContextFor(p))
        p.pendingOffer = undefined
        p.pendingLevelUps -= 1
      }
    }
  }
}
