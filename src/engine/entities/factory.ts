import type { Vec2 } from '../core/vector'
import type { Entity } from '../types'

const base = (): Entity => ({
  kind: 'enemy',
  active: true,
  pos: { x: 0, y: 0 },
  vel: { x: 0, y: 0 },
  radius: 10,
  hp: 1,
  maxHp: 1,
  speed: 0,
  damage: 0,
  life: 0,
  xp: 0,
})

export function createPlayer(pos: Vec2): Entity {
  return { ...base(), kind: 'player', pos: { ...pos }, radius: 14, hp: 100, maxHp: 100, speed: 200 }
}

export function createEnemy(pos: Vec2): Entity {
  return { ...base(), kind: 'enemy', pos: { ...pos }, radius: 12, hp: 10, maxHp: 10, speed: 60, damage: 5, xp: 1 }
}

export function createProjectile(pos: Vec2, dir: Vec2, speed: number, damage: number): Entity {
  return {
    ...base(),
    kind: 'projectile',
    pos: { ...pos },
    vel: { x: dir.x * speed, y: dir.y * speed },
    radius: 5,
    hp: 1,
    maxHp: 1,
    damage,
    life: 1.5,
  }
}

export function createGem(pos: Vec2, xp: number): Entity {
  return { ...base(), kind: 'gem', pos: { ...pos }, radius: 6, xp }
}
