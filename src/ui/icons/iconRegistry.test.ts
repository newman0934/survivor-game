import { describe, it, expect } from 'vitest'
import { resolveOptionIcon } from './iconRegistry'

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
