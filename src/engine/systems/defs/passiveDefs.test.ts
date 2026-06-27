import { describe, it, expect } from 'vitest'
import { PASSIVE_DEFS } from './passiveDefs'
import type { PlayerStats, UpgradeContext, Passive } from '../../types'
import { createPlayer } from '../../entities/factory'

function makeCtx(): UpgradeContext {
  const stats: PlayerStats = {
    moveSpeed: 200, pickupRadius: 120, damageMult: 1, cooldownMult: 1,
    projectileSpeedMult: 1, areaMult: 1, regen: 0, armor: 0, xpGain: 1,
  }
  const passives: Passive[] = []
  const player = createPlayer({ x: 0, y: 0 })
  return { stats, weapons: [], passives, player, heal: () => {} }
}

describe('passiveDefs', () => {
  it('菠菜提升 damageMult', () => {
    const c = makeCtx()
    PASSIVE_DEFS.spinach.apply(c)
    expect(c.stats.damageMult).toBeCloseTo(1.1, 5)
  })
  it('護甲增加 armor 固定值', () => {
    const c = makeCtx()
    PASSIVE_DEFS.armor.apply(c)
    expect(c.stats.armor).toBe(2)
  })
  it('番茄增加 regen', () => {
    const c = makeCtx()
    PASSIVE_DEFS.tomato.apply(c)
    expect(c.stats.regen).toBeCloseTo(0.6, 5)
  })
  it('皇冠增加 xpGain', () => {
    const c = makeCtx()
    PASSIVE_DEFS.crown.apply(c)
    expect(c.stats.xpGain).toBeCloseTo(1.15, 5)
  })
  it('空心之心同步提升 player.maxHp 與 hp', () => {
    const c = makeCtx()
    const hp0 = c.player.hp
    const max0 = c.player.maxHp
    PASSIVE_DEFS.heart.apply(c)
    expect(c.player.maxHp).toBe(max0 + 25)
    expect(c.player.hp).toBe(hp0 + 25)
  })
})
