import type { Entity, PlayerStats } from './types'
import type { Vec2 } from './core/vector'
import { distance } from './core/vector'
import { createRng, type Rng } from './core/rng'
import { createPlayer, createEnemy, createProjectile, createGem } from './entities/factory'
import { applyVelocity, steerTowards } from './systems/movement'
import { spawnInterval, spawnPositionAround } from './systems/spawn'
import { findNearest } from './systems/combat'
import { circlesOverlap } from './systems/collision'
import { attractGem } from './systems/pickup'
import { xpForLevel, ALL_UPGRADES } from './systems/leveling'
import type { Summary } from '../stores/game'

const SPAWN_RADIUS = 700
const GEM_PULL_SPEED = 350

export class World {
  player: Entity
  enemies: Entity[] = []
  projectiles: Entity[] = []
  gemEntities: Entity[] = []

  stats: PlayerStats = {
    moveSpeed: 200,
    fireCooldown: 0.5,
    projectileDamage: 5,
    projectileSpeed: 400,
    pickupRadius: 120,
  }

  moveInput: Vec2 = { x: 0, y: 0 }

  private rng: Rng
  private elapsed = 0
  private spawnTimer = 0
  private fireTimer = 0
  private level = 1
  private xp = 0
  private kills = 0
  private pendingLevelUp = false

  constructor(seed: number) {
    this.rng = createRng(seed)
    this.player = createPlayer({ x: 0, y: 0 })
  }

  activeEnemies(): Entity[] {
    return this.enemies.filter((e) => e.active)
  }
  gems(): Entity[] {
    return this.gemEntities
  }

  spawnEnemyAt(pos: Vec2): Entity {
    const e = createEnemy(pos)
    this.enemies.push(e)
    return e
  }

  forceFire(): void {
    this.fireTimer = 0
  }

  grantXp(amount: number): void {
    this.xp += amount
    while (this.xp >= xpForLevel(this.level)) {
      this.xp -= xpForLevel(this.level)
      this.level += 1
      this.pendingLevelUp = true
    }
  }

  consumeLevelUp(): boolean {
    if (this.pendingLevelUp) {
      this.pendingLevelUp = false
      return true
    }
    return false
  }

  applyUpgrade(id: string): void {
    const up = ALL_UPGRADES.find((u) => u.id === id)
    up?.apply(this.stats)
  }

  step(dt: number): void {
    this.elapsed += dt

    this.player.vel = { x: this.moveInput.x * this.stats.moveSpeed, y: this.moveInput.y * this.stats.moveSpeed }
    applyVelocity(this.player, dt)

    this.spawnTimer -= dt
    if (this.spawnTimer <= 0) {
      this.spawnTimer = spawnInterval(this.elapsed)
      const pos = spawnPositionAround(this.player.pos, SPAWN_RADIUS, this.rng.next())
      this.spawnEnemyAt(pos)
    }

    for (const e of this.enemies) {
      if (!e.active) continue
      steerTowards(e, this.player.pos)
      applyVelocity(e, dt)
    }

    this.fireTimer -= dt
    if (this.fireTimer <= 0) {
      const target = findNearest(this.player.pos, this.enemies)
      if (target) {
        this.fireTimer = this.stats.fireCooldown
        const dir = {
          x: target.pos.x - this.player.pos.x,
          y: target.pos.y - this.player.pos.y,
        }
        const len = Math.hypot(dir.x, dir.y) || 1
        const proj = createProjectile(
          this.player.pos,
          { x: dir.x / len, y: dir.y / len },
          this.stats.projectileSpeed,
          this.stats.projectileDamage,
        )
        this.projectiles.push(proj)
      }
    }

    for (const p of this.projectiles) {
      if (!p.active) continue
      applyVelocity(p, dt)
      p.life -= dt
      if (p.life <= 0) {
        p.active = false
        continue
      }
      for (const e of this.enemies) {
        if (!e.active) continue
        if (circlesOverlap(p, e)) {
          e.hp -= p.damage
          p.active = false
          if (e.hp <= 0) {
            e.active = false
            this.kills += 1
            const gem = createGem(e.pos, e.xp)
            this.gemEntities.push(gem)
          }
          break
        }
      }
    }

    for (const g of this.gemEntities) {
      if (!g.active) continue
      attractGem(g, this.player.pos, this.stats.pickupRadius, GEM_PULL_SPEED)
      applyVelocity(g, dt)
      if (distance(g.pos, this.player.pos) <= this.player.radius) {
        g.active = false
        this.grantXp(g.xp)
      }
    }

    for (const e of this.enemies) {
      if (!e.active) continue
      if (circlesOverlap(e, this.player)) {
        this.player.hp -= e.damage * dt * 10
      }
    }

    this.enemies = this.enemies.filter((e) => e.active)
    this.projectiles = this.projectiles.filter((p) => p.active)
    this.gemEntities = this.gemEntities.filter((g) => g.active)
  }

  isPlayerDead(): boolean {
    return this.player.hp <= 0
  }

  summary(): Summary {
    return {
      hp: Math.max(0, Math.round(this.player.hp)),
      maxHp: this.player.maxHp,
      time: Math.floor(this.elapsed),
      level: this.level,
      kills: this.kills,
      xp: this.xp,
      xpNeeded: xpForLevel(this.level),
    }
  }
}
