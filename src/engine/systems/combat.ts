/**
 * 戰鬥 system（combat）。
 *
 * 提供武器自動鎖定目標所需的查詢函式。武器會自動朝「最近的敵人」開火，
 * 本檔案負責找出該目標；實際的開火計時、投射物建立與發射方向交由 World 處理。
 * 純函式、無狀態。
 *
 * 在 World.step() 中的角色：當玩家武器冷卻歸零時，World 以玩家座標呼叫 findNearest
 * 取得鎖定目標，再朝該目標生成投射物。
 */
import type { Entity } from '../types'
import type { Vec2 } from '../core/vector'
import { distance } from '../core/vector'

/**
 * 從一組敵人中找出距離 from 最近、且仍存活（active）的一隻。
 *
 * 用於武器自動鎖定：線性掃描所有敵人，略過已失效者，回傳距離最小的目標。
 *
 * @param from    量測距離的起點（通常是玩家座標）。
 * @param enemies 候選敵人陣列。
 * @returns 最近的存活敵人；若沒有任何存活敵人則回傳 null。
 */
export function findNearest(from: Vec2, enemies: Entity[]): Entity | null {
  let best: Entity | null = null
  let bestDist = Infinity
  for (const e of enemies) {
    if (!e.active) continue // 略過已死亡/待回收的 entity
    const d = distance(from, e.pos)
    if (d < bestDist) {
      bestDist = d
      best = e
    }
  }
  return best
}

/**
 * 找出距離 from 最近的 n 隻存活敵人，由近到遠排序。
 *
 * 用於多投射物武器（如高等魔杖）一次鎖定多個目標：先濾掉失效者，依距離排序後取前 n 隻。
 * 不足 n 隻時回傳全部存活者。
 *
 * @param from    量測距離的起點（通常是玩家座標）。
 * @param enemies 候選敵人陣列。
 * @param n       想取得的目標數量。
 * @returns 最多 n 隻、由近到遠的存活敵人。
 */
export function findNearestN(from: Vec2, enemies: Entity[], n: number): Entity[] {
  return enemies
    .filter((e) => e.active)
    .map((e) => ({ e, d: distance(from, e.pos) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((x) => x.e)
}
