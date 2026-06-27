import { describe, it, expect } from 'vitest'
import { createPlayer, createEnemy, createProjectile, createEnemyProjectile, createGem, createChest } from './factory'
import { ENEMY_DEFS } from '../systems/defs/enemyDefs'

describe('entity factory', () => {
  it('creates an active player at a position', () => {
    const p = createPlayer({ x: 100, y: 100 })
    expect(p.kind).toBe('player')
    expect(p.active).toBe(true)
    expect(p.pos).toEqual({ x: 100, y: 100 })
    expect(p.hp).toBeGreaterThan(0)
  })
  it('creates an enemy with hp and speed', () => {
    const e = createEnemy({ x: 0, y: 0 })
    expect(e.kind).toBe('enemy')
    expect(e.hp).toBeGreaterThan(0)
    expect(e.speed).toBeGreaterThan(0)
  })
  it('creates a projectile with velocity, damage and finite life', () => {
    const pr = createProjectile({ x: 0, y: 0 }, { x: 1, y: 0 }, 200, 5)
    expect(pr.kind).toBe('projectile')
    expect(pr.vel).toEqual({ x: 200, y: 0 })
    expect(pr.damage).toBe(5)
    expect(pr.life).toBeGreaterThan(0)
  })
  it('creates a gem carrying xp', () => {
    const g = createGem({ x: 0, y: 0 }, 3)
    expect(g.kind).toBe('gem')
    expect(g.xp).toBe(3)
  })
})

describe('createEnemy by kind', () => {
  it('未指定種類時建立 virus', () => {
    const e = createEnemy({ x: 0, y: 0 })
    expect(e.enemyKind).toBe('virus')
    expect(e.hp).toBe(ENEMY_DEFS.virus.hp)
  })

  it('依種類套用對應數值', () => {
    const t = createEnemy({ x: 0, y: 0 }, 'spore')
    expect(t.enemyKind).toBe('spore')
    expect(t.hp).toBe(ENEMY_DEFS.spore.hp)
    expect(t.speed).toBe(ENEMY_DEFS.spore.speed)
    expect(t.damage).toBe(ENEMY_DEFS.spore.damage)
    expect(t.radius).toBe(ENEMY_DEFS.spore.radius)
    expect(t.xp).toBe(ENEMY_DEFS.spore.xp)
  })

  it('spiral 初始 behaviorTimer 為 0', () => {
    const c = createEnemy({ x: 0, y: 0 }, 'spiral')
    expect(c.behaviorTimer).toBe(0)
  })
})

describe('createChest', () => {
  it('建立 chest entity（radius 14）', () => {
    const c = createChest({ x: 5, y: 6 })
    expect(c.kind).toBe('chest')
    expect(c.pos).toEqual({ x: 5, y: 6 })
    expect(c.radius).toBe(14)
    expect(c.active).toBe(true)
  })
})

describe('createEnemyProjectile', () => {
  it('createEnemyProjectile 為 toxin 投射物、帶傷害', () => {
    const p = createEnemyProjectile({ x: 0, y: 0 }, { x: 1, y: 0 }, 180, 8)
    expect(p.kind).toBe('projectile')
    expect(p.projShape).toBe('toxin')
    expect(p.damage).toBe(8)
    expect(p.vel.x).toBeCloseTo(180, 5)
  })
})
