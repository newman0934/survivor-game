import { describe, it, expect } from 'vitest'
import { createPlayer, createEnemy, createProjectile, createGem } from './factory'
import { ENEMY_DEFS } from '../systems/enemyDefs'

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
  it('未指定種類時建立 basic', () => {
    const e = createEnemy({ x: 0, y: 0 })
    expect(e.enemyKind).toBe('basic')
    expect(e.hp).toBe(ENEMY_DEFS.basic.hp)
  })

  it('依種類套用對應數值', () => {
    const t = createEnemy({ x: 0, y: 0 }, 'tank')
    expect(t.enemyKind).toBe('tank')
    expect(t.hp).toBe(ENEMY_DEFS.tank.hp)
    expect(t.speed).toBe(ENEMY_DEFS.tank.speed)
    expect(t.damage).toBe(ENEMY_DEFS.tank.damage)
    expect(t.radius).toBe(ENEMY_DEFS.tank.radius)
    expect(t.xp).toBe(ENEMY_DEFS.tank.xp)
  })

  it('charger 初始 behaviorTimer 為 0', () => {
    const c = createEnemy({ x: 0, y: 0 }, 'charger')
    expect(c.behaviorTimer).toBe(0)
  })
})
