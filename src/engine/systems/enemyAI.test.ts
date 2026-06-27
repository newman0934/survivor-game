import { describe, it, expect } from 'vitest'
import { steerEnemy, steerSpitter, spitterTick } from './enemyAI'
import { createEnemy } from '../entities/factory'
import { ENEMY_DEFS } from './defs/enemyDefs'

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

describe('steerSpitter', () => {
  it('steerSpitter 太遠靠近、太近後退、區間停步', () => {
    const range = ENEMY_DEFS.spitter.spit!.range
    const e1 = createEnemy({ x: 0, y: 0 }, 'spitter'); steerSpitter(e1, { x: range + 100, y: 0 })
    expect(e1.vel.x).toBeGreaterThan(0) // 太遠 → 朝 +x 靠近
    const e2 = createEnemy({ x: 0, y: 0 }, 'spitter'); steerSpitter(e2, { x: range - 100, y: 0 })
    expect(e2.vel.x).toBeLessThan(0)    // 太近 → 朝 -x 後退
    const e3 = createEnemy({ x: 0, y: 0 }, 'spitter'); steerSpitter(e3, { x: range, y: 0 })
    expect(e3.vel).toEqual({ x: 0, y: 0 }) // 區間內停步
  })
})

describe('spitterTick', () => {
  it('spitterTick 達 interval 開火並扣回', () => {
    const e = createEnemy({ x: 0, y: 0 }, 'spitter'); e.behaviorTimer = 0
    expect(spitterTick(e, 1, 2.2)).toBe(false)
    expect(spitterTick(e, 1.5, 2.2)).toBe(true) // 累計 2.5 ≥ 2.2
    expect(e.behaviorTimer).toBeCloseTo(0.3, 5)
  })
})
