import { describe, it, expect } from 'vitest'
import { fireWand, fireKnife, orbitPositions, garlicTick } from './weapons'
import { createEnemy } from '../entities/factory'

describe('weapons', () => {
  it('fireWand 朝最近 count 隻各射一發', () => {
    const near = createEnemy({ x: 30, y: 0 })
    const far = createEnemy({ x: 300, y: 0 })
    const projs = fireWand({ x: 0, y: 0 }, [far, near], 1, 5, 400)
    expect(projs).toHaveLength(1)
    expect(projs[0].kind).toBe('projectile')
    expect(projs[0].vel.x).toBeGreaterThan(0) // 朝 +x 的最近敵人
    expect(projs[0].damage).toBe(5)
  })

  it('fireWand 無敵人時不發射', () => {
    expect(fireWand({ x: 0, y: 0 }, [], 2, 5, 400)).toHaveLength(0)
  })

  it('fireKnife 依 count 產生對應數量、朝指定方向', () => {
    const projs = fireKnife({ x: 0, y: 0 }, { x: 1, y: 0 }, 3, 4, 600)
    expect(projs).toHaveLength(3)
    // 每發速度大小皆為 600
    const speeds = projs.map((p) => Math.hypot(p.vel.x, p.vel.y))
    speeds.forEach((s) => expect(s).toBeCloseTo(600, 0))
    // 奇數發時中央那發正對方向（vy ≈ 0）
    expect(projs.some((p) => Math.abs(p.vel.y) < 1e-6)).toBe(true)
  })

  it('orbitPositions 在圓上等分 count 個點', () => {
    const pts = orbitPositions({ x: 0, y: 0 }, 2, 100, 0)
    expect(pts).toHaveLength(2)
    expect(Math.hypot(pts[0].x, pts[0].y)).toBeCloseTo(100, 5)
    // 兩點相隔 180 度
    expect(pts[1].x).toBeCloseTo(-pts[0].x, 5)
    expect(pts[1].y).toBeCloseTo(-pts[0].y, 5)
  })

  it('garlicTick 只對半徑內敵人扣 dmg*dt', () => {
    const inside = createEnemy({ x: 20, y: 0 })
    const outside = createEnemy({ x: 500, y: 0 })
    inside.hp = 10
    outside.hp = 10
    garlicTick({ x: 0, y: 0 }, [inside, outside], 70, 3, 1)
    expect(inside.hp).toBeCloseTo(7, 5) // 10 - 3*1
    expect(outside.hp).toBe(10)
  })
})
