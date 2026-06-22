import { describe, it, expect } from 'vitest'
import { findNearest } from './combat'
import { createPlayer, createEnemy } from '../entities/factory'

describe('combat targeting', () => {
  it('finds the nearest active enemy', () => {
    const player = createPlayer({ x: 0, y: 0 })
    const near = createEnemy({ x: 10, y: 0 })
    const far = createEnemy({ x: 500, y: 0 })
    expect(findNearest(player.pos, [near, far])).toBe(near)
  })
  it('ignores inactive enemies', () => {
    const player = createPlayer({ x: 0, y: 0 })
    const near = createEnemy({ x: 10, y: 0 })
    near.active = false
    const far = createEnemy({ x: 500, y: 0 })
    expect(findNearest(player.pos, [near, far])).toBe(far)
  })
  it('returns null when there are no active enemies', () => {
    const player = createPlayer({ x: 0, y: 0 })
    expect(findNearest(player.pos, [])).toBeNull()
  })
})
