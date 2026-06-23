import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from './game'

describe('game store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('starts on the menu', () => {
    const s = useGameStore()
    expect(s.phase).toBe('menu')
  })
  it('start() moves to playing and resets summary', () => {
    const s = useGameStore()
    s.start()
    expect(s.phase).toBe('playing')
    expect(s.kills).toBe(0)
    expect(s.level).toBe(1)
  })
  it('offerUpgrades() pauses and stores options', () => {
    const s = useGameStore()
    s.start()
    s.offerUpgrades([{ id: 'damage', label: '傷害 +3' }])
    expect(s.phase).toBe('upgrading')
    expect(s.upgradeOptions).toHaveLength(1)
  })
  it('gameOver() records final summary', () => {
    const s = useGameStore()
    s.start()
    s.updateSummary({ hp: 0, maxHp: 100, time: 42, level: 3, kills: 99, xp: 0, xpNeeded: 10, bossActive: false, bossHp: 0, bossMaxHp: 0 })
    s.gameOver()
    expect(s.phase).toBe('over')
    expect(s.time).toBe(42)
    expect(s.kills).toBe(99)
  })
  it('start() clears onUpgradePicked to null', () => {
    const s = useGameStore()
    s.onUpgradePicked = (_id) => {}
    s.start()
    expect(s.onUpgradePicked).toBeNull()
  })
  it('pickUpgrade() calls the wired callback, clears options, and resumes', () => {
    const s = useGameStore()
    s.start()
    let picked: string | null = null
    s.onUpgradePicked = (id) => { picked = id }
    s.offerUpgrades([{ id: 'damage', label: '傷害 +3' }])
    s.pickUpgrade('damage')
    expect(picked).toBe('damage')
    expect(s.upgradeOptions).toHaveLength(0)
    expect(s.phase).toBe('playing')
  })
  it('toMenu() sets phase to menu', () => {
    const s = useGameStore()
    s.start()
    s.toMenu()
    expect(s.phase).toBe('menu')
  })
})
