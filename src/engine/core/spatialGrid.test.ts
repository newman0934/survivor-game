import { describe, it, expect } from 'vitest'
import { SpatialGrid } from './spatialGrid'

describe('SpatialGrid', () => {
  it('returns items near a position within radius', () => {
    const grid = new SpatialGrid<{ x: number; y: number }>(50)
    const near = { x: 10, y: 10 }
    const far = { x: 1000, y: 1000 }
    grid.insert(near, near.x, near.y)
    grid.insert(far, far.x, far.y)
    const found = grid.queryRadius(0, 0, 100)
    expect(found).toContain(near)
    expect(found).not.toContain(far)
  })
  it('clear empties the grid', () => {
    const grid = new SpatialGrid<{ x: number; y: number }>(50)
    const p = { x: 5, y: 5 }
    grid.insert(p, p.x, p.y)
    grid.clear()
    expect(grid.queryRadius(0, 0, 100)).toEqual([])
  })

  it('handles negative coordinates (cells in all four quadrants)', () => {
    const grid = new SpatialGrid<{ x: number; y: number }>(50)
    const q1 = { x: 120, y: 120 }
    const q2 = { x: -120, y: 120 }
    const q3 = { x: -120, y: -120 }
    const q4 = { x: 120, y: -120 }
    for (const p of [q1, q2, q3, q4]) grid.insert(p, p.x, p.y)
    // 以原點為心、半徑涵蓋四個象限的點
    const found = grid.queryRadius(0, 0, 200)
    expect(found).toContain(q1)
    expect(found).toContain(q2)
    expect(found).toContain(q3)
    expect(found).toContain(q4)
  })

  it('does not collide distinct negative/positive cells into one bucket', () => {
    const grid = new SpatialGrid<{ id: string }>(50)
    // (cx=-1, cy=2) 與 (cx=2, cy=-1)：天真的 cx*K+cy 易混淆的對稱情形
    const a = { id: 'a' } // 落在 cx=-1, cy=2
    const b = { id: 'b' } // 落在 cx=2, cy=-1
    grid.insert(a, -30, 110)
    grid.insert(b, 110, -30)
    // 只查 a 所在格範圍，不應撈到 b
    const nearA = grid.queryRadius(-30, 110, 10)
    expect(nearA).toContain(a)
    expect(nearA).not.toContain(b)
  })
})
