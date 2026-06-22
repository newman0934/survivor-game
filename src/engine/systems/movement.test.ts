import { describe, it, expect } from 'vitest'
import { applyVelocity, steerTowards } from './movement'
import { createEnemy } from '../entities/factory'

describe('movement', () => {
  it('applyVelocity advances position by vel * dt', () => {
    const e = createEnemy({ x: 0, y: 0 })
    e.vel = { x: 10, y: 20 }
    applyVelocity(e, 0.5)
    expect(e.pos).toEqual({ x: 5, y: 10 })
  })
  it('steerTowards sets velocity pointing at target at entity speed', () => {
    const e = createEnemy({ x: 0, y: 0 })
    e.speed = 100
    steerTowards(e, { x: 0, y: 50 })
    expect(e.vel).toEqual({ x: 0, y: 100 })
  })
})
