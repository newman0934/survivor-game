import { describe, it, expect } from 'vitest'
import { spawnInterval, spawnPositionAround } from './spawn'

describe('spawn', () => {
  it('spawn interval shrinks as elapsed time grows (harder over time)', () => {
    const early = spawnInterval(0)
    const late = spawnInterval(120)
    expect(late).toBeLessThan(early)
  })
  it('spawn interval never drops below a floor', () => {
    expect(spawnInterval(100000)).toBeGreaterThanOrEqual(0.2)
  })
  it('spawnPositionAround returns a point at the given distance from center', () => {
    const center = { x: 100, y: 100 }
    const p = spawnPositionAround(center, 300, 0.5)
    const dist = Math.hypot(p.x - center.x, p.y - center.y)
    expect(dist).toBeCloseTo(300, 5)
  })
})
