export interface Vec2 {
  x: number
  y: number
}

export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y })
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y })
export const scale = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s })
export const length = (a: Vec2): number => Math.hypot(a.x, a.y)
export const distance = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y)

export const normalize = (a: Vec2): Vec2 => {
  const len = length(a)
  if (len === 0) return { x: 0, y: 0 }
  return { x: a.x / len, y: a.y / len }
}
