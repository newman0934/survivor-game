import type { Entity } from '../types'
import type { Vec2 } from '../core/vector'
import { distance, normalize, sub, scale } from '../core/vector'

export function attractGem(gem: Entity, playerPos: Vec2, pickupRadius: number, pullSpeed: number): void {
  if (distance(gem.pos, playerPos) <= pickupRadius) {
    gem.vel = scale(normalize(sub(playerPos, gem.pos)), pullSpeed)
  } else {
    gem.vel = { x: 0, y: 0 }
  }
}
