import { describe, it, expect } from 'vitest'
import { World } from './World'
import { xpForLevel } from './systems/leveling'

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
    const before = w.stats.damageMult
    w.applyUpgrade('damage')
    expect(w.stats.damageMult).toBeGreaterThan(before)
  })

  it('起始只持有魔杖', () => {
    const w = new World(1)
    expect(w.weapons.map((x) => x.kind)).toEqual(['wand'])
  })

  it('套用 unlock 後新增武器並共存', () => {
    const w = new World(1)
    w.applyUpgrade('unlock:knife')
    expect(w.weapons.map((x) => x.kind).sort()).toEqual(['knife', 'wand'])
  })

  it('魔杖在有敵人時會產生投射物', () => {
    const w = new World(1)
    // 敵人放遠，讓投射物在數步內仍在飛行（避免命中後被清除導致誤判）。
    w.spawnEnemyAt({ x: 300, y: 0 })
    for (let i = 0; i < 5; i++) w.step(1 / 60)
    expect(w.projectiles.length).toBeGreaterThan(0)
  })

  it('大蒜對靠近的敵人造成傷害', () => {
    const w = new World(1)
    w.applyUpgrade('unlock:garlic')
    const e = w.spawnEnemyAt({ x: 20, y: 0 }) // 在大蒜半徑內
    const hp0 = e.hp
    w.step(1 / 60)
    expect(e.hp).toBeLessThan(hp0)
  })

  it('持有聖經時 orbits 數量等於聖經等級的 count', () => {
    const w = new World(1)
    w.applyUpgrade('unlock:bible') // Lv1 → count 1
    w.step(1 / 60)
    expect(w.orbits().length).toBe(1)
  })

  it('isPlayerDead reflects player hp dropping to zero', () => {
    const w = new World(1)
    expect(w.isPlayerDead()).toBe(false)
    w.player.hp = 0
    expect(w.isPlayerDead()).toBe(true)
  })

  it('consumeLevelUp returns true once per level gained when several happen at once', () => {
    const w = new World(1)
    // Grant enough xp to cross two level thresholds in a single call.
    w.grantXp(xpForLevel(1) + xpForLevel(2))
    expect(w.consumeLevelUp()).toBe(true)
    expect(w.consumeLevelUp()).toBe(true)
    expect(w.consumeLevelUp()).toBe(false)
  })
})
