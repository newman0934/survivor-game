import { describe, it, expect } from 'vitest'
import { createPlayer, createEnemy, createProjectile, createGem } from './factory'

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
