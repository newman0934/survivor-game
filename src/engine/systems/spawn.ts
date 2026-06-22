import type { Vec2 } from '../core/vector'

// Seconds between spawns. Starts at 1.2s, decays toward a 0.2s floor.
export function spawnInterval(elapsedSeconds: number): number {
  const floor = 0.2
  const start = 1.2
  const decayed = start * Math.exp(-elapsedSeconds / 90)
  return Math.max(floor, decayed)
}

// t in [0,1) maps to an angle around the circle; returns a point `radius` away.
export function spawnPositionAround(center: Vec2, radius: number, t: number): Vec2 {
  const angle = t * Math.PI * 2
  return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius }
}
