import type { Entity } from '../types'
import { distance } from '../core/vector'

export function circlesOverlap(a: Entity, b: Entity): boolean {
  return distance(a.pos, b.pos) <= a.radius + b.radius
}
