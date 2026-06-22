import { describe, it, expect } from 'vitest'
import { add, sub, scale, length, normalize, distance } from './vector'

describe('vector', () => {
  it('adds and subtracts', () => {
    expect(add({ x: 1, y: 2 }, { x: 3, y: 4 })).toEqual({ x: 4, y: 6 })
    expect(sub({ x: 3, y: 4 }, { x: 1, y: 2 })).toEqual({ x: 2, y: 2 })
  })
  it('scales', () => {
    expect(scale({ x: 2, y: -3 }, 2)).toEqual({ x: 4, y: -6 })
  })
  it('computes length and distance', () => {
    expect(length({ x: 3, y: 4 })).toBe(5)
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })
  it('normalizes to unit length, and zero vector stays zero', () => {
    const n = normalize({ x: 0, y: 5 })
    expect(n).toEqual({ x: 0, y: 1 })
    expect(normalize({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 })
  })
})
