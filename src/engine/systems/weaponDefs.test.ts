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
    expect(WEAPON_DEFS.inflammation.evolution!.fieldRegen).toBe(1.5)
  })
})
