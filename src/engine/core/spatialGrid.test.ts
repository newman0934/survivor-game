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
})
