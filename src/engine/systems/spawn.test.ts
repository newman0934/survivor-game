import { describe, it, expect } from 'vitest'
import { spawnInterval, spawnPositionAround, pickEnemyKind } from './spawn'
import { createRng } from '../core/rng'

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

describe('pickEnemyKind', () => {
  it('t=0 只會選到已解鎖的 basic / swarm', () => {
    const rng = createRng(1)
    for (let i = 0; i < 200; i++) {
      const k = pickEnemyKind(0, rng)
      expect(['basic', 'swarm']).toContain(k)
    }
  })

  it('t>=45 候選含 tank、t>=90 候選含 charger', () => {
    const rng = createRng(2)
    const at60 = new Set<string>()
    const at120 = new Set<string>()
    for (let i = 0; i < 500; i++) at60.add(pickEnemyKind(60, rng))
    for (let i = 0; i < 500; i++) at120.add(pickEnemyKind(120, rng))
    expect(at60.has('tank')).toBe(true)
    expect(at60.has('charger')).toBe(false)
    expect(at120.has('charger')).toBe(true)
  })

  it('確定性：相同 seed 產生相同序列', () => {
    const a = createRng(7)
    const b = createRng(7)
    const seqA = Array.from({ length: 10 }, () => pickEnemyKind(120, a))
    const seqB = Array.from({ length: 10 }, () => pickEnemyKind(120, b))
    expect(seqA).toEqual(seqB)
  })

  it('一般生怪永不選到 boss（即使時間極大）', () => {
    const rng = createRng(3)
    for (let i = 0; i < 500; i++) {
      expect(pickEnemyKind(100000, rng)).not.toBe('boss')
    }
  })
})
