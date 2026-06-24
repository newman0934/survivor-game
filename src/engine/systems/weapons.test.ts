import { describe, it, expect } from 'vitest'
import { fireWand, fireKnife, orbitPositions, garlicTick, phagocyteSweep, chainTargets, novaBurst, PHAGOCYTE_HALF_ANGLE } from './weapons'
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

  it('phagocyteSweep 只打前方扇形半徑內的敵人', () => {
    const front = createEnemy({ x: 40, y: 0 }); front.hp = 20
    const behind = createEnemy({ x: -40, y: 0 }); behind.hp = 20
    const farFront = createEnemy({ x: 300, y: 0 }); farFront.hp = 20
    const hits = phagocyteSweep({ x: 0, y: 0 }, { x: 1, y: 0 }, [front, behind, farFront], 70, PHAGOCYTE_HALF_ANGLE, 8)
    expect(hits).toContain(front)
    expect(hits).not.toContain(behind)   // 背後不中
    expect(hits).not.toContain(farFront) // 超出半徑不中
    expect(front.hp).toBe(12)            // 20 - 8
    expect(behind.hp).toBe(20)
  })

  it('chainTargets 從最近起連跳、受跳數與範圍限制、依序回傳', () => {
    const a = createEnemy({ x: 30, y: 0 })
    const b = createEnemy({ x: 70, y: 0 })
    const c = createEnemy({ x: 110, y: 0 })
    const far = createEnemy({ x: 900, y: 0 })
    const seq = chainTargets({ x: 0, y: 0 }, [c, far, a, b], 3, 60)
    expect(seq).toEqual([a, b, c]) // 0→a(30)→b(+40)→c(+40)，far 超範圍不接
  })

  it('chainTargets 跳數上限封頂', () => {
    const a = createEnemy({ x: 20, y: 0 })
    const b = createEnemy({ x: 40, y: 0 })
    const c = createEnemy({ x: 60, y: 0 })
    expect(chainTargets({ x: 0, y: 0 }, [a, b, c], 2, 60)).toEqual([a, b])
  })

  it('novaBurst 對半徑內全體扣血', () => {
    const inside = createEnemy({ x: 50, y: 0 }); inside.hp = 20
    const outside = createEnemy({ x: 500, y: 0 }); outside.hp = 20
    const hits = novaBurst({ x: 0, y: 0 }, [inside, outside], 120, 12)
    expect(hits).toEqual([inside])
    expect(inside.hp).toBe(8) // 20 - 12
    expect(outside.hp).toBe(20)
  })

  it('三武器函式無敵人時皆回空陣列、不崩潰', () => {
    expect(phagocyteSweep({ x: 0, y: 0 }, { x: 1, y: 0 }, [], 70, PHAGOCYTE_HALF_ANGLE, 8)).toEqual([])
    expect(chainTargets({ x: 0, y: 0 }, [], 3, 160)).toEqual([])
    expect(novaBurst({ x: 0, y: 0 }, [], 120, 12)).toEqual([])
  })
})
