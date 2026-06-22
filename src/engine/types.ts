import type { Vec2 } from './core/vector'

export type EntityKind = 'player' | 'enemy' | 'projectile' | 'gem'

export interface Entity {
  kind: EntityKind
  active: boolean
  pos: Vec2
  vel: Vec2
  radius: number
  hp: number
  maxHp: number
  speed: number
  // projectile/enemy damage dealt on contact/hit
  damage: number
  // projectile lifetime in seconds (counts down); ignored for others
  life: number
  // gem xp value; ignored for others
  xp: number
}

export interface PlayerStats {
  moveSpeed: number
  fireCooldown: number // seconds between shots
  projectileDamage: number
  projectileSpeed: number
  pickupRadius: number
}

export interface UpgradeOption {
  id: string
  label: string
  apply: (stats: PlayerStats) => void
}
