import { describe, it, expect } from 'vitest'
import { World } from './World'

describe('World', () => {
  it('starts with one player and no enemies', () => {
    const w = new World(1)
    expect(w.player.kind).toBe('player')
    expect(w.activeEnemies().length).toBe(0)
  })

  it('spawns enemies over time', () => {
    const w = new World(1)
    for (let i = 0; i < 180; i++) w.step(1 / 60)
    expect(w.activeEnemies().length).toBeGreaterThan(0)
  })

  it('player takes damage when an enemy is in contact', () => {
    const w = new World(1)
    const startHp = w.player.hp
    const e = w.spawnEnemyAt({ x: w.player.pos.x, y: w.player.pos.y })
    w.step(1 / 60)
    expect(w.player.hp).toBeLessThan(startHp)
    expect(e).toBeDefined()
  })

  it('a projectile kills an enemy and drops a gem', () => {
    const w = new World(1)
    // Disable gem attraction so the dropped gem stays put and is observable;
    // otherwise it would be pulled into the player and collected within the loop.
    w.stats.pickupRadius = 0
    const e = w.spawnEnemyAt({ x: w.player.pos.x + 30, y: w.player.pos.y })
    e.hp = 1
    w.forceFire()
    for (let i = 0; i < 20; i++) w.step(1 / 60)
    expect(e.active).toBe(false)
    expect(w.gems().length).toBeGreaterThan(0)
  })

  it('collecting enough xp raises the pending level-up flag', () => {
    const w = new World(1)
    w.grantXp(w.summary().xpNeeded)
    expect(w.consumeLevelUp()).toBe(true)
    expect(w.consumeLevelUp()).toBe(false)
  })

  it('applyUpgrade mutates player stats', () => {
    const w = new World(1)
    const before = w.stats.projectileDamage
    w.applyUpgrade('damage')
    expect(w.stats.projectileDamage).toBeGreaterThan(before)
  })
})
