import { describe, it, expect } from 'vitest'
import { xpForLevel, rollUpgrades, buildCandidates, applyUpgradeById } from './leveling'
import { createRng } from '../core/rng'
import type { PlayerStats, UpgradeContext, Weapon } from '../types'

function makeStats(): PlayerStats {
  return { moveSpeed: 200, pickupRadius: 120, damageMult: 1, cooldownMult: 1, projectileSpeedMult: 1, areaMult: 1 }
}
function makeCtx(weapons: Weapon[]): UpgradeContext {
  return { stats: makeStats(), weapons, heal: () => {} }
}

describe('leveling', () => {
  it('xp 需求隨等級遞增', () => {
    expect(xpForLevel(2)).toBeGreaterThan(xpForLevel(1))
  })

  it('只持有魔杖時候選含解鎖其他武器與升級魔杖', () => {
    const ctx = makeCtx([{ kind: 'wand', level: 1, cooldownTimer: 0 }])
    const ids = buildCandidates(ctx).map((o) => o.id)
    expect(ids).toContain('unlock:knife')
    expect(ids).toContain('unlock:bible')
    expect(ids).toContain('unlock:garlic')
    expect(ids).toContain('levelup:wand')
    expect(ids).toContain('damage')
  })

  it('武器滿級後不再出現該武器的升級候選', () => {
    const ctx = makeCtx([{ kind: 'wand', level: 5, cooldownTimer: 0 }])
    const ids = buildCandidates(ctx).map((o) => o.id)
    expect(ids).not.toContain('levelup:wand')
  })

  it('持有四把武器後不再出現解鎖候選', () => {
    const ctx = makeCtx([
      { kind: 'wand', level: 1, cooldownTimer: 0 },
      { kind: 'knife', level: 1, cooldownTimer: 0 },
      { kind: 'bible', level: 1, cooldownTimer: 0 },
      { kind: 'garlic', level: 1, cooldownTimer: 0 },
    ])
    const ids = buildCandidates(ctx).map((o) => o.id)
    expect(ids.some((id) => id.startsWith('unlock:'))).toBe(false)
  })

  it('rollUpgrades 回傳 3 張不重複候選', () => {
    const ctx = makeCtx([{ kind: 'wand', level: 1, cooldownTimer: 0 }])
    const opts = rollUpgrades(createRng(1), 3, ctx)
    expect(opts).toHaveLength(3)
    expect(new Set(opts.map((o) => o.id)).size).toBe(3)
  })

  it('候選不足時以 heal 保底補滿', () => {
    const ctx = makeCtx([{ kind: 'wand', level: 1, cooldownTimer: 0 }])
    const opts = rollUpgrades(createRng(2), 50, ctx)
    expect(opts.length).toBe(50)
    expect(opts.some((o) => o.id === 'heal')).toBe(true)
  })

  it('applyUpgradeById: unlock 加入新武器（Lv1）', () => {
    const ctx = makeCtx([{ kind: 'wand', level: 1, cooldownTimer: 0 }])
    applyUpgradeById('unlock:knife', ctx)
    expect(ctx.weapons.find((w) => w.kind === 'knife')?.level).toBe(1)
  })

  it('applyUpgradeById: levelup 提升既有武器等級', () => {
    const ctx = makeCtx([{ kind: 'wand', level: 1, cooldownTimer: 0 }])
    applyUpgradeById('levelup:wand', ctx)
    expect(ctx.weapons.find((w) => w.kind === 'wand')?.level).toBe(2)
  })

  it('applyUpgradeById: 被動套用乘區', () => {
    const ctx = makeCtx([{ kind: 'wand', level: 1, cooldownTimer: 0 }])
    applyUpgradeById('damage', ctx)
    expect(ctx.stats.damageMult).toBeCloseTo(1.15, 5)
  })

  it('applyUpgradeById: 未知 id 安靜略過', () => {
    const ctx = makeCtx([{ kind: 'wand', level: 1, cooldownTimer: 0 }])
    expect(() => applyUpgradeById('nope', ctx)).not.toThrow()
    expect(ctx.weapons).toHaveLength(1)
  })

  it('確定性：相同 seed 產生相同候選 id 序列', () => {
    const a = rollUpgrades(createRng(7), 3, makeCtx([{ kind: 'wand', level: 1, cooldownTimer: 0 }]))
    const b = rollUpgrades(createRng(7), 3, makeCtx([{ kind: 'wand', level: 1, cooldownTimer: 0 }]))
    expect(a.map((o) => o.id)).toEqual(b.map((o) => o.id))
  })
})
