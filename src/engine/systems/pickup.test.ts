import { describe, it, expect } from 'vitest'
import { attractGem } from './pickup'
import { createPlayer, createGem } from '../entities/factory'

describe('pickup', () => {
  it('pulls a gem toward the player when within pickup radius', () => {
    const player = createPlayer({ x: 0, y: 0 })
    const gem = createGem({ x: 50, y: 0 }, 1)
    attractGem(gem, player.pos, 100, 300) // pickupRadius 100, pull speed 300
    expect(gem.vel.x).toBeLessThan(0) // moving toward player (negative x)
  })
  it('leaves gem stationary when outside pickup radius', () => {
    const player = createPlayer({ x: 0, y: 0 })
    const gem = createGem({ x: 500, y: 0 }, 1)
    attractGem(gem, player.pos, 100, 300)
    expect(gem.vel).toEqual({ x: 0, y: 0 })
  })
})
