import { describe, it, expect } from 'vitest'
import { xpForLevel, rollUpgrades, buildCandidates, applyUpgradeById } from './leveling'
import { createRng } from '../core/rng'
import { createPlayer } from '../entities/factory'
import type { PlayerStats, UpgradeContext, Weapon, Passive } from '../types'

function makeStats(): PlayerStats {
  return {
    moveSpeed: 200, pickupRadius: 120, damageMult: 1, cooldownMult: 1,
    projectileSpeedMult: 1, areaMult: 1, regen: 0, armor: 0, xpGain: 1,
  }
}
function makeCtx(weapons: Weapon[], passives: Passive[] = []): UpgradeContext {
  return { stats: makeStats(), weapons, passives, player: createPlayer({ x: 0, y: 0 }), heal: () => {} }
}

describe('leveling', () => {
  it('xp 需求隨等級遞增', () => {
    expect(xpForLevel(2)).toBeGreaterThan(xpForLevel(1))
  })

  it('只持有魔杖時候選含解鎖其他武器與升級魔杖', () => {
    const ctx = makeCtx([{ kind: 'antibody', level: 1, cooldownTimer: 0 }])
    const ids = buildCandidates(ctx).map((o) => o.id)
    expect(ids).toContain('unlock:perforin')
    expect(ids).toContain('unlock:complement')
    expect(ids).toContain('unlock:inflammation')
    expect(ids).toContain('levelup:antibody')
    expect(ids).toContain('passunlock:spinach')
  })

  it('武器滿級後不再出現該武器的升級候選', () => {
    const ctx = makeCtx([{ kind: 'antibody', level: 5, cooldownTimer: 0 }])
    const ids = buildCandidates(ctx).map((o) => o.id)
    expect(ids).not.toContain('levelup:antibody')
  })

  it('持有七把武器後不再出現解鎖候選', () => {
    const ctx = makeCtx([
      { kind: 'antibody', level: 1, cooldownTimer: 0 },
      { kind: 'perforin', level: 1, cooldownTimer: 0 },
      { kind: 'complement', level: 1, cooldownTimer: 0 },
      { kind: 'inflammation', level: 1, cooldownTimer: 0 },
      { kind: 'phagocyte', level: 1, cooldownTimer: 0 },
      { kind: 'cascade', level: 1, cooldownTimer: 0 },
      { kind: 'nova', level: 1, cooldownTimer: 0 },
    ])
    const ids = buildCandidates(ctx).map((o) => o.id)
    expect(ids.some((id) => id.startsWith('unlock:'))).toBe(false)
  })

  it('rollUpgrades 回傳 3 張不重複候選', () => {
    const ctx = makeCtx([{ kind: 'antibody', level: 1, cooldownTimer: 0 }])
    const opts = rollUpgrades(createRng(1), 3, ctx)
    expect(opts).toHaveLength(3)
    expect(new Set(opts.map((o) => o.id)).size).toBe(3)
  })

  it('候選不足時以 heal 保底補滿', () => {
    const ctx = makeCtx([{ kind: 'antibody', level: 1, cooldownTimer: 0 }])
    const opts = rollUpgrades(createRng(2), 50, ctx)
    expect(opts.length).toBe(50)
    expect(opts.some((o) => o.id === 'heal')).toBe(true)
  })

  it('applyUpgradeById: unlock 加入新武器（Lv1）', () => {
    const ctx = makeCtx([{ kind: 'antibody', level: 1, cooldownTimer: 0 }])
    applyUpgradeById('unlock:perforin', ctx)
    expect(ctx.weapons.find((w) => w.kind === 'perforin')?.level).toBe(1)
  })

  it('applyUpgradeById: levelup 提升既有武器等級', () => {
    const ctx = makeCtx([{ kind: 'antibody', level: 1, cooldownTimer: 0 }])
    applyUpgradeById('levelup:antibody', ctx)
    expect(ctx.weapons.find((w) => w.kind === 'antibody')?.level).toBe(2)
  })

  it('applyUpgradeById: 未知 id 安靜略過', () => {
    const ctx = makeCtx([{ kind: 'antibody', level: 1, cooldownTimer: 0 }])
    expect(() => applyUpgradeById('nope', ctx)).not.toThrow()
    expect(ctx.weapons).toHaveLength(1)
  })

  it('確定性：相同 seed 產生相同候選 id 序列', () => {
    const a = rollUpgrades(createRng(7), 3, makeCtx([{ kind: 'antibody', level: 1, cooldownTimer: 0 }]))
    const b = rollUpgrades(createRng(7), 3, makeCtx([{ kind: 'antibody', level: 1, cooldownTimer: 0 }]))
    expect(a.map((o) => o.id)).toEqual(b.map((o) => o.id))
  })

  // ---------- 被動道具 ----------
  it('未持有被動時候選含解鎖被動', () => {
    const ids = buildCandidates(makeCtx([{ kind: 'antibody', level: 1, cooldownTimer: 0 }])).map((o) => o.id)
    expect(ids).toContain('passunlock:spinach')
    expect(ids).toContain('passunlock:armor')
  })

  it('候選不再含舊的無限乘區卡', () => {
    const ids = buildCandidates(makeCtx([{ kind: 'antibody', level: 1, cooldownTimer: 0 }])).map((o) => o.id)
    for (const old of ['damage', 'firerate', 'projspeed', 'movespeed', 'pickup']) {
      expect(ids).not.toContain(old)
    }
  })

  it('被動達上限 6 後不再出解鎖被動候選', () => {
    const passives: Passive[] = ['spinach', 'tome', 'bracer', 'wings', 'magnet', 'candle']
      .map((k) => ({ kind: k as Passive['kind'], level: 1 }))
    const ids = buildCandidates(makeCtx([{ kind: 'antibody', level: 1, cooldownTimer: 0 }], passives)).map((o) => o.id)
    expect(ids.some((id) => id.startsWith('passunlock:'))).toBe(false)
    expect(ids).toContain('passlvl:spinach') // 仍可升級既有
  })

  it('被動滿級後不再出該被動升級候選', () => {
    const passives: Passive[] = [{ kind: 'spinach', level: 5 }]
    const ids = buildCandidates(makeCtx([{ kind: 'antibody', level: 1, cooldownTimer: 0 }], passives)).map((o) => o.id)
    expect(ids).not.toContain('passlvl:spinach')
  })

  it('applyUpgradeById: passunlock 新增被動 Lv1 並套用一次', () => {
    const ctx = makeCtx([], [])
    applyUpgradeById('passunlock:spinach', ctx)
    expect(ctx.passives.find((p) => p.kind === 'spinach')?.level).toBe(1)
    expect(ctx.stats.damageMult).toBeCloseTo(1.1, 5)
  })

  it('applyUpgradeById: passlvl 升級既有被動並再套用一次', () => {
    const ctx = makeCtx([], [{ kind: 'spinach', level: 1 }])
    ctx.stats.damageMult = 1.1 // 模擬 Lv1 已套
    applyUpgradeById('passlvl:spinach', ctx)
    expect(ctx.passives.find((p) => p.kind === 'spinach')?.level).toBe(2)
    expect(ctx.stats.damageMult).toBeCloseTo(1.21, 5)
  })
})
