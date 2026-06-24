import { describe, it, expect } from 'vitest'
import { evolutionStatus } from './loadout'

describe('evolutionStatus', () => {
  it('已進化 → evolved', () => {
    expect(evolutionStatus({ kind: 'antibody', level: 5, evolved: true }, ['tome'])).toBe('evolved')
  })
  it('滿級 + 持有所需被動 → ready', () => {
    expect(evolutionStatus({ kind: 'antibody', level: 5 }, ['tome'])).toBe('ready')
  })
  it('滿級但缺所需被動 → pending', () => {
    expect(evolutionStatus({ kind: 'antibody', level: 5 }, ['heart'])).toBe('pending')
  })
  it('未滿級 → pending（即使持有被動）', () => {
    expect(evolutionStatus({ kind: 'antibody', level: 3 }, ['tome'])).toBe('pending')
  })
})
