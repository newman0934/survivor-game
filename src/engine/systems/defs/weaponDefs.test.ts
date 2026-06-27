import { describe, it, expect } from 'vitest'
import { WEAPON_DEFS, WEAPON_ORDER } from './weaponDefs'

describe('武器進化資料表', () => {
  it('七把武器皆有 evolution 且 requires 對應正確', () => {
    const expected: Record<string, string> = {
      antibody: 'tome', perforin: 'bracer', complement: 'spinach',
      inflammation: 'tomato', phagocyte: 'wings', cascade: 'candle', nova: 'magnet',
    }
    for (const kind of WEAPON_ORDER) {
      const evo = WEAPON_DEFS[kind].evolution
      expect(evo, `${kind} 應有 evolution`).toBeDefined()
      expect(evo!.requires).toBe(expected[kind])
      expect(evo!.label.length).toBeGreaterThan(0)
      expect(evo!.level.damage).toBeGreaterThan(0)
    }
  })
  it('招牌旗標掛在正確武器上', () => {
    expect(WEAPON_DEFS.perforin.evolution!.pierce).toBe(3)
    expect(WEAPON_DEFS.cascade.evolution!.noFalloff).toBe(true)
    expect(WEAPON_DEFS.phagocyte.evolution!.halfAngle).toBeCloseTo(Math.PI)
    expect(WEAPON_DEFS.inflammation.evolution!.fieldRegen).toBe(6)
    expect(WEAPON_DEFS.complement.evolution!.hitCooldown).toBe(0.25)
  })
  it('七把進化層數值快照（防止誤改）', () => {
    expect(WEAPON_DEFS.antibody.evolution!.level).toMatchObject({ cooldown: 0.12, damage: 12, count: 5, projectileSpeed: 500 })
    expect(WEAPON_DEFS.perforin.evolution!.level).toMatchObject({ cooldown: 0.12, damage: 8, count: 5, projectileSpeed: 750 })
    expect(WEAPON_DEFS.complement.evolution!.level).toMatchObject({ damage: 12, count: 6, radius: 150, angularSpeed: 4.5 })
    expect(WEAPON_DEFS.inflammation.evolution!.level).toMatchObject({ damage: 16, radius: 170 })
    expect(WEAPON_DEFS.phagocyte.evolution!.level).toMatchObject({ cooldown: 0.3, damage: 30, radius: 130 })
    expect(WEAPON_DEFS.cascade.evolution!.level).toMatchObject({ cooldown: 0.45, damage: 24, count: 9, radius: 260 })
    expect(WEAPON_DEFS.nova.evolution!.level).toMatchObject({ cooldown: 0.8, damage: 40, radius: 300 })
  })
})
