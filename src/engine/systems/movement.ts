import type { Entity } from '../types'
import type { Vec2 } from '../core/vector'
import { normalize, sub, scale } from '../core/vector'

export function applyVelocity(e: Entity, dt: number): void {
  e.pos.x += e.vel.x * dt
  e.pos.y += e.vel.y * dt
}

export function steerTowards(e: Entity, target: Vec2): void {
  const dir = normalize(sub(target, e.pos))
  e.vel = scale(dir, e.speed)
}
