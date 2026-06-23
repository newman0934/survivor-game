import { describe, it, expect } from 'vitest'
import { steerEnemy } from './enemyAI'
import { createEnemy } from '../entities/factory'
import { ENEMY_DEFS } from './enemyDefs'

describe('enemyAI', () => {
  it('virus 朝玩家直線移動', () => {
    const e = createEnemy({ x: 100, y: 0 }, 'virus')
    steerEnemy(e, { x: 0, y: 0 }, 1 / 60)
    expect(e.vel.x).toBeLessThan(0) // 朝 -x（玩家方向）
    expect(Math.abs(e.vel.y)).toBeLessThan(1e-6)
    expect(Math.hypot(e.vel.x, e.vel.y)).toBeCloseTo(ENEMY_DEFS.virus.speed, 5)
  })

  it('spiral 走路相朝玩家、速度約走路速', () => {
    const e = createEnemy({ x: 100, y: 0 }, 'spiral')
    steerEnemy(e, { x: 0, y: 0 }, 1 / 60) // behaviorTimer=0 → 走路相
    expect(e.vel.x).toBeLessThan(0)
    expect(Math.hypot(e.vel.x, e.vel.y)).toBeCloseTo(ENEMY_DEFS.spiral.speed, 0)
  })

  it('spiral 跨入衝刺相時鎖定方向並加速', () => {
    const e = createEnemy({ x: 100, y: 0 }, 'spiral')
    e.behaviorTimer = ENEMY_DEFS.spiral.walkTime! - 1 / 120 // 走路相末端，下一步跨入衝刺相
    steerEnemy(e, { x: 0, y: 0 }, 1 / 60)
    expect(Math.hypot(e.vel.x, e.vel.y)).toBeCloseTo(ENEMY_DEFS.spiral.dashSpeed!, 0)
    expect(e.vel.x).toBeLessThan(0) // 朝玩家方向衝
  })

  it('spiral 衝刺相中不再轉向（維持速度向量）', () => {
    const e = createEnemy({ x: 100, y: 0 }, 'spiral')
    e.behaviorTimer = ENEMY_DEFS.spiral.walkTime! + ENEMY_DEFS.spiral.dashTime! / 2 // 衝刺相中段
    e.vel = { x: -320, y: 0 }
    steerEnemy(e, { x: 0, y: 999 }, 1 / 60) // 玩家換位置，但不應改變 vel
    expect(e.vel).toEqual({ x: -320, y: 0 })
  })
})
