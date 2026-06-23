/**
 * 敵人 AI system（enemyAI）。
 *
 * 無狀態純函式：依敵人 enemyKind 設定其速度向量。basic/swarm/tank 直線追玩家；
 * charger 依 behaviorTimer 跑「走路↔衝刺」狀態機。實際位移仍由 movement.applyVelocity 處理。
 * 不依賴 Vue/Pinia。
 */
import type { Entity } from '../types'
import type { Vec2 } from '../core/vector'
import { normalize, sub, scale } from '../core/vector'
import { steerTowards } from './movement'
import { ENEMY_DEFS } from './enemyDefs'

/**
 * 依敵人種類設定其速度向量，朝 target（玩家）行動。
 * @param e      要轉向的敵人（vel/behaviorTimer 會被就地修改）。
 * @param target 目標位置（玩家座標）。
 * @param dt     固定步長秒數。
 */
export function steerEnemy(e: Entity, target: Vec2, dt: number): void {
  if (e.enemyKind === 'charger') {
    steerCharger(e, target, dt)
    return
  }
  steerTowards(e, target) // basic / swarm / tank：直線追擊
}

/** charger 狀態機：走路相慢速轉向；跨入衝刺相鎖定方向加速；衝刺相維持速度。 */
function steerCharger(e: Entity, target: Vec2, dt: number): void {
  const def = ENEMY_DEFS.charger
  const walkTime = def.walkTime!
  const dashTime = def.dashTime!
  const cycle = walkTime + dashTime

  const prev = (e.behaviorTimer ?? 0) % cycle
  e.behaviorTimer = (e.behaviorTimer ?? 0) + dt
  const cur = e.behaviorTimer % cycle

  const prevDashing = prev >= walkTime
  const curDashing = cur >= walkTime

  if (curDashing && !prevDashing) {
    // 進入衝刺：鎖定當下朝玩家方向、設衝刺速
    e.vel = scale(normalize(sub(target, e.pos)), def.dashSpeed!)
  } else if (!curDashing) {
    // 走路相：慢速朝玩家轉向
    e.vel = scale(normalize(sub(target, e.pos)), def.speed)
  }
  // 衝刺相中（curDashing && prevDashing）：保持既有 vel，不轉向
}
