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
 * 用於多投射物武器（如高等魔杖）一次鎖定多個目標。以單次掃描維護一個依距離升冪、
 * 最多 n 筆的 top-k——免去全排序的 O(n log n) 與 filter/map/sort/slice 的中間陣列與
 * 包裝物件配置（敵人多、n 小時更划算）。平手（距離相等）保留較早出現者，與穩定排序一致。
 * 不足 n 隻時回傳全部存活者。
 *
 * @param from    量測距離的起點（通常是玩家座標）。
 * @param enemies 候選敵人陣列。
 * @param n       想取得的目標數量。
 * @returns 最多 n 隻、由近到遠的存活敵人。
 */
export function findNearestN(from: Vec2, enemies: Entity[], n: number): Entity[] {
  if (n <= 0) return []
  const top: Entity[] = [] // 升冪排序的目前最近者
  const dist: number[] = [] // 與 top 對齊的距離
  for (const e of enemies) {
    if (!e.active) continue // 略過已死亡/待回收的 entity
    const d = distance(from, e.pos)
    let i: number
    if (top.length < n) {
      // 還沒滿：附加到尾端再往前冒泡到正確位置
      i = top.length
      top.push(e)
      dist.push(d)
    } else {
      // 已滿：不比最遠者近（含平手）就略過，否則覆寫末位再冒泡
      if (d >= dist[n - 1]) continue
      i = n - 1
      top[i] = e
      dist[i] = d
    }
    // 用嚴格大於比較往前移：平手者停在相等元素之後，保留先到順序（等同穩定排序）
    while (i > 0 && dist[i - 1] > d) {
      top[i] = top[i - 1]
      dist[i] = dist[i - 1]
      top[i - 1] = e
      dist[i - 1] = d
      i--
    }
  }
  return top
}
