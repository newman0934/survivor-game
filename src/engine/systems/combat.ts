import type { Entity } from '../types'
import type { Vec2 } from '../core/vector'
import { distance } from '../core/vector'

export function findNearest(from: Vec2, enemies: Entity[]): Entity | null {
  let best: Entity | null = null
  let bestDist = Infinity
  for (const e of enemies) {
    if (!e.active) continue
    const d = distance(from, e.pos)
    if (d < bestDist) {
      bestDist = d
      best = e
    }
  }
  return best
}
