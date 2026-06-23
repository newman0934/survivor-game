/**
 * 拾取 system（pickup）。
 *
 * 負責經驗寶石（gem）被玩家「吸取」的磁吸行為：當寶石進入玩家的吸取範圍時，
 * 設定其速度朝玩家飛去；超出範圍則停止移動。純函式、無狀態。
 *
 * 在 World.step() 中的角色：World 對每顆寶石呼叫 attractGem 設定吸附速度，位移交由
 * movement 的 applyVelocity 處理；當寶石與玩家實際碰撞時（見 collision）才結算經驗值並回收寶石。
 */
import type { Entity } from '../types'
import type { Vec2 } from '../core/vector'
import { distance, normalize, sub, scale } from '../core/vector'

/**
 * 依玩家位置更新單顆寶石的吸附速度。
 *
 * 寶石在玩家吸取範圍內時，會以 pullSpeed 朝玩家直線飛去（磁吸效果）；
 * 超出範圍則速度歸零、原地不動。實際位移由 movement system 套用速度完成。
 *
 * @param gem          要更新的寶石 entity（vel 會被就地修改）。
 * @param playerPos    玩家目前座標。
 * @param pickupRadius 玩家的吸取範圍半徑；寶石進入此範圍才會被吸引。
 * @param pullSpeed    被吸引時朝玩家飛行的速度。
 */
export function attractGem(gem: Entity, playerPos: Vec2, pickupRadius: number, pullSpeed: number): void {
  if (distance(gem.pos, playerPos) <= pickupRadius) {
    // 在吸取範圍內：朝玩家方向以 pullSpeed 飛行
    gem.vel = scale(normalize(sub(playerPos, gem.pos)), pullSpeed)
  } else {
    // 範圍外：靜止等待玩家靠近
    gem.vel = { x: 0, y: 0 }
  }
}
