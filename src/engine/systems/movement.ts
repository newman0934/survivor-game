/**
 * 移動 system（movement）。
 *
 * 負責把 entity 的速度（vel）套用到位置（pos），以及讓追蹤型 entity（例如敵人）
 * 朝目標轉向。本檔案是無狀態的純函式集合，所有可變狀態都存在 World 上的 entity。
 *
 * 在 World.step() 中的角色：
 * - 先用 steerTowards 設定敵人朝玩家的速度，再用 applyVelocity 依固定步長 dt 推進所有 entity 的位置。
 *   玩家的速度則由輸入系統設定後同樣交給 applyVelocity 推進。
 */
import type { Entity } from '../types'
import type { Vec2 } from '../core/vector'
import { normalize, sub, scale } from '../core/vector'

/**
 * 依目前速度與固定步長把 entity 往前推進一格。
 *
 * 採固定步長積分（pos += vel * dt），與 FPS 解耦以維持確定性。
 *
 * @param e  要移動的 entity（pos 會被就地修改）。
 * @param dt 這一步的時間長度（秒）；遊戲迴圈固定為 1/60。
 */
export function applyVelocity(e: Entity, dt: number): void {
  e.pos.x += e.vel.x * dt
  e.pos.y += e.vel.y * dt
}

/**
 * 讓 entity 以自身 speed 朝指定目標點全速移動（設定其速度向量）。
 *
 * 用於敵人追玩家：先求出指向目標的單位方向，再乘上 entity 的移動速度。
 * 只設定 vel，實際位移交由 applyVelocity 處理。
 *
 * @param e      要轉向的 entity（vel 會被就地修改）。
 * @param target 目標位置（通常是玩家座標）。
 */
export function steerTowards(e: Entity, target: Vec2): void {
  // 取「entity → 目標」的單位方向，再依自身 speed 縮放成速度向量
  const dir = normalize(sub(target, e.pos))
  e.vel = scale(dir, e.speed)
}
