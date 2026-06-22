import { describe, it, expect } from 'vitest'
import { createRng } from './rng'

describe('rng', () => {
  it('is deterministic for a given seed', () => {
    const a = createRng(42)
    const b = createRng(42)
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()])
  })
  it('next() returns values in [0,1)', () => {
    const r = createRng(1)
    for (let i = 0; i < 100; i++) {
      const v = r.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
  it('range(min,max) stays within bounds', () => {
    const r = createRng(7)
    for (let i = 0; i < 100; i++) {
      const v = r.range(10, 20)
      expect(v).toBeGreaterThanOrEqual(10)
      expect(v).toBeLessThan(20)
    }
  })
  it('pick returns an element of the array', () => {
    const r = createRng(3)
    const arr = ['a', 'b', 'c']
    expect(arr).toContain(r.pick(arr))
  })
})
