import { describe, it, expect } from 'vitest'
import { xpForLevel, rollUpgrades, ALL_UPGRADES } from './leveling'
import { createRng } from '../core/rng'
import type { PlayerStats } from '../types'

describe('leveling', () => {
  it('xp required increases with level', () => {
    expect(xpForLevel(2)).toBeGreaterThan(xpForLevel(1))
  })
  it('rollUpgrades returns 3 distinct options', () => {
    const rng = createRng(1)
    const opts = rollUpgrades(rng, 3)
    expect(opts).toHaveLength(3)
    const ids = opts.map((o) => o.id)
    expect(new Set(ids).size).toBe(3)
  })
  it('applying an upgrade mutates player stats', () => {
    const stats: PlayerStats = {
      moveSpeed: 200,
      fireCooldown: 0.5,
      projectileDamage: 5,
      projectileSpeed: 400,
      pickupRadius: 100,
    }
    const dmg = ALL_UPGRADES.find((u) => u.id === 'damage')!
    dmg.apply(stats)
    expect(stats.projectileDamage).toBeGreaterThan(5)
  })
})
