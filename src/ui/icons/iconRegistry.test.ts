import { describe, it, expect } from 'vitest'
import { resolveOptionIcon, WEAPON_ICONS, PASSIVE_ICONS, CHARACTER_ICONS } from './iconRegistry'
import { WEAPON_ORDER } from '../../engine/systems/defs/weaponDefs'
import { PASSIVE_ORDER } from '../../engine/systems/defs/passiveDefs'
import { CHARACTER_ORDER } from '../../engine/systems/defs/characterDefs'

const HEX = /^#[0-9a-fA-F]{6}$/

describe('resolveOptionIcon', () => {
  it('武器前綴對應 weapon', () => {
    expect(resolveOptionIcon('unlock:antibody')).toEqual({ category: 'weapon', kind: 'antibody' })
    expect(resolveOptionIcon('levelup:nova')).toEqual({ category: 'weapon', kind: 'nova' })
    expect(resolveOptionIcon('evolve:cascade')).toEqual({ category: 'weapon', kind: 'cascade' })
  })
  it('被動前綴對應 passive', () => {
    expect(resolveOptionIcon('passunlock:heart')).toEqual({ category: 'passive', kind: 'heart' })
    expect(resolveOptionIcon('passlvl:tome')).toEqual({ category: 'passive', kind: 'tome' })
  })
  it('heal / 未知 / 空 / 缺 kind 回 null', () => {
    expect(resolveOptionIcon('heal')).toBeNull()
    expect(resolveOptionIcon('weird:x')).toBeNull()
    expect(resolveOptionIcon('')).toBeNull()
    expect(resolveOptionIcon('unlock:')).toBeNull()
  })
})

describe('圖示 registry 完整性', () => {
  it('每個武器 kind 都有圖示', () => {
    for (const k of WEAPON_ORDER) expect(WEAPON_ICONS[k]).toBeDefined()
  })
  it('每個被動 kind 都有圖示', () => {
    for (const k of PASSIVE_ORDER) expect(PASSIVE_ICONS[k]).toBeDefined()
  })
  it('無 placeholder：paths/fills 非空、每條 d 非空、color 合法', () => {
    for (const def of [...Object.values(WEAPON_ICONS), ...Object.values(PASSIVE_ICONS)]) {
      expect(def.paths.length + (def.fills?.length ?? 0)).toBeGreaterThan(0)
      for (const d of [...def.paths, ...(def.fills ?? [])]) expect(d.trim().length).toBeGreaterThan(0)
      expect(def.color).toMatch(HEX)
    }
  })
})

describe('角色圖示完整性', () => {
  it('每個角色 kind 都有圖示', () => {
    for (const k of CHARACTER_ORDER) expect(CHARACTER_ICONS[k]).toBeDefined()
  })
  it('角色圖示無 placeholder', () => {
    for (const def of Object.values(CHARACTER_ICONS)) {
      expect(def.paths.length + (def.fills?.length ?? 0)).toBeGreaterThan(0)
      for (const d of [...def.paths, ...(def.fills ?? [])]) expect(d.trim().length).toBeGreaterThan(0)
      expect(def.color).toMatch(HEX)
    }
  })
})
