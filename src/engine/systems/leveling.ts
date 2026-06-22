import type { UpgradeOption } from '../types'
import type { Rng } from '../core/rng'

// Total xp needed to go from (level-1) to level.
export function xpForLevel(level: number): number {
  return 5 + (level - 1) * 5
}

export const ALL_UPGRADES: UpgradeOption[] = [
  { id: 'damage', label: '傷害 +3', apply: (s) => { s.projectileDamage += 3 } },
  { id: 'firerate', label: '攻速 +15%', apply: (s) => { s.fireCooldown *= 0.85 } },
  { id: 'movespeed', label: '移速 +12%', apply: (s) => { s.moveSpeed *= 1.12 } },
  { id: 'projspeed', label: '彈速 +20%', apply: (s) => { s.projectileSpeed *= 1.2 } },
  { id: 'pickup', label: '吸取範圍 +25%', apply: (s) => { s.pickupRadius *= 1.25 } },
]

export function rollUpgrades(rng: Rng, count: number): UpgradeOption[] {
  const pool = [...ALL_UPGRADES]
  const chosen: UpgradeOption[] = []
  while (chosen.length < count && pool.length > 0) {
    const i = Math.floor(rng.next() * pool.length)
    chosen.push(pool.splice(i, 1)[0])
  }
  return chosen
}
