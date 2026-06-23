/**
 * 生怪 system（spawn）。
 *
 * 提供「依遊戲時間決定生怪節奏的曲線」與「在玩家四周環形上計算生怪座標」兩個純函式。
 * 本身不持有任何狀態，也不直接建立 entity；實際的生怪計時與 enemy factory 呼叫由 World 負責。
 *
 * 在 World.step() 中的角色：World 累計生怪計時器，向 spawnInterval 詢問目前該間隔多久生一隻，
 * 並用 spawnPositionAround 算出在畫面外環形上的生成點，讓敵人從玩家視野邊緣湧入。
 */
import type { Vec2 } from '../core/vector'
import type { Rng } from '../core/rng'
import type { EnemyKind } from '../types'
import { ENEMY_DEFS, ENEMY_ORDER } from './enemyDefs'

/**
 * 生怪曲線：回傳目前每隔幾秒生一隻敵人。
 *
 * 設計意圖：隨遊戲時間推進讓敵人越生越快（壓力遞增）。間隔從 1.2 秒起算，
 * 以時間常數 90 秒做指數衰減，並在 0.2 秒處設下限避免間隔趨近 0 造成無上限暴量。
 *
 * @param elapsedSeconds 自開局以來經過的遊戲時間（秒）。
 * @returns 下一隻敵人應該間隔的秒數，介於 0.2（地板）到 1.2（開局值）之間。
 */
export function spawnInterval(elapsedSeconds: number): number {
  const floor = 0.2 // 間隔下限：不論玩多久，最快也只到每 0.2 秒一隻
  const start = 1.2 // 開局間隔
  const decayed = start * Math.exp(-elapsedSeconds / 90) // 指數衰減，90 秒為時間常數
  return Math.max(floor, decayed)
}

/**
 * 在以 center 為圓心、radius 為半徑的圓周上取一點，作為生怪座標。
 *
 * 設計意圖：敵人應從玩家視野邊緣的環形上生成；半徑通常取略大於畫面以避免敵人憑空出現在眼前。
 *
 * @param center 圓心（通常是玩家座標）。
 * @param radius 生成環的半徑。
 * @param t      環上參數，範圍 [0,1)，會線性對應到 0~2π 的角度。
 * @returns 環上對應角度的座標點。
 */
export function spawnPositionAround(center: Vec2, radius: number, t: number): Vec2 {
  const angle = t * Math.PI * 2 // 將 [0,1) 映射為一圈完整角度
  return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius }
}

/**
 * 依目前遊戲時間，在「已解鎖」（elapsed >= unlockTime）的敵種間依 spawnWeight 加權抽一種。
 *
 * 設計意圖：前期只有早解鎖的弱怪，較強敵種隨時間混入，難度有層次。
 * 為維持確定性，亂數一律走傳入的 seeded rng，不可使用 Math.random。
 *
 * @param elapsed 自開局以來的遊戲時間（秒）。
 * @param rng     seeded 亂數產生器。
 * @returns 抽中的敵人種類。
 */
export function pickEnemyKind(elapsed: number, rng: Rng): EnemyKind {
  const unlocked = ENEMY_ORDER.filter((k) => elapsed >= ENEMY_DEFS[k].unlockTime)
  const total = unlocked.reduce((s, k) => s + ENEMY_DEFS[k].spawnWeight, 0)
  let r = rng.next() * total
  for (const k of unlocked) {
    r -= ENEMY_DEFS[k].spawnWeight
    if (r < 0) return k
  }
  return unlocked[unlocked.length - 1] // 浮點保險：理論上不會走到
}
