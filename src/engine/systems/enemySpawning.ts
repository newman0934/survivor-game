/**
 * 生怪系統：在 World 上生成敵人／群襲／Boss／終局 Boss，以及觸發地圖事件。
 * 全走 World.rng（seeded），維持確定性；為無狀態函式，操作傳入的 World 資料。
 */
import type { World } from '../World'
import type { Entity, EnemyKind, EliteAffix, GameEventKind } from '../types'
import type { Vec2 } from '../core/vector'
import { createEnemy } from '../entities/factory'
import { ENEMY_DEFS } from './defs/enemyDefs'
import { ELITE_AFFIX_DEFS } from './defs/eliteDefs'
import { spawnPositionAround, pickEnemyKind } from './spawn'
import { pickAffix } from './events'

/** 敵人生成的距離：在玩家周圍此半徑的圓上隨機生怪（畫面外）。 */
export const SPAWN_RADIUS = 700
/** 事件生怪數量。 */
const ELITE_PACK_COUNT = 3
const SWARM_RUSH_COUNT = 12
const ENCIRCLE_COUNT = 16

/** 依地圖倍率縮放單一敵人的 hp/maxHp。 */
export function scaleEnemyHp(world: World, e: Entity): void {
  e.hp *= world.mapEnemyHpMult
  e.maxHp = e.hp
}

/**
 * 在指定位置生成一隻敵人並加入場上；可選 affix 使其成為精英。
 * @returns 新建立的敵人 entity。
 */
export function spawnEnemy(world: World, pos: Vec2, kind: EnemyKind = 'virus', affix?: EliteAffix): Entity {
  const e = createEnemy(pos, kind)
  scaleEnemyHp(world, e)
  if (affix) {
    const a = ELITE_AFFIX_DEFS[affix]
    e.affix = affix
    e.hp = e.maxHp = e.maxHp * 3 * a.hpMult
    e.radius *= a.radiusMult
    e.speed *= a.speedMult
    e.damage *= a.damageMult
    e.xp *= 5
  }
  world.enemies.push(e)
  return e
}

/** 在指定位置附近一次生成一小群 swarm（4 隻，固定角度偏移，維持確定性）。 */
export function spawnSwarm(world: World, pos: Vec2): void {
  const offsets = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]
  const r = 24
  for (const a of offsets) {
    const e = createEnemy({ x: pos.x + Math.cos(a) * r, y: pos.y + Math.sin(a) * r }, 'bacteria')
    scaleEnemyHp(world, e)
    world.enemies.push(e)
  }
}

/** 在指定位置生成一隻 Boss，hp 依目前 bossCount 縮放（每隻比前一隻硬），並遞增 bossCount。 */
export function spawnBoss(world: World, pos: Vec2): Entity {
  const b = createEnemy(pos, 'superbug')
  const scale = 1 + 0.5 * world.bossCount
  b.hp = ENEMY_DEFS.superbug.hp * scale
  b.maxHp = b.hp
  scaleEnemyHp(world, b)
  b.hp *= world.playerCount
  b.maxHp *= world.playerCount
  world.bossCount += 1
  world.enemies.push(b)
  world.pushSound('boss')
  return b
}

/** 生成終局 Boss（固定數值、不套地圖 enemyHpMult、不參與 bossCount 縮放）。 */
export function spawnFinalBoss(world: World, pos: Vec2): Entity {
  const b = createEnemy(pos, 'finalboss')
  // 確保 hp 未被套用地圖倍率（createEnemy 從 ENEMY_DEFS 直接讀取）
  b.hp = ENEMY_DEFS.finalboss.hp * world.playerCount
  b.maxHp = b.hp
  world.enemies.push(b)
  world.pushSound('boss')
  return b
}

/** 觸發一個地圖事件：依種類生成對應的一波敵人（全走 seeded rng）。 */
export function triggerGameEvent(world: World, kind: GameEventKind): void {
  if (kind === 'swarm-rush') {
    const baseT = world.rng.next()
    for (let i = 0; i < SWARM_RUSH_COUNT; i++) {
      const t = baseT + (i - SWARM_RUSH_COUNT / 2) * 0.02
      spawnEnemy(world, spawnPositionAround(world.player.pos, SPAWN_RADIUS, t), 'virus')
    }
  } else if (kind === 'elite-pack') {
    for (let i = 0; i < ELITE_PACK_COUNT; i++) {
      const pos = spawnPositionAround(world.player.pos, SPAWN_RADIUS, world.rng.next())
      spawnEnemy(world, pos, pickEnemyKind(world.elapsed, world.rng), pickAffix(world.rng))
    }
  } else if (kind === 'encircle') {
    for (let i = 0; i < ENCIRCLE_COUNT; i++) {
      const pos = spawnPositionAround(world.player.pos, SPAWN_RADIUS, i / ENCIRCLE_COUNT)
      spawnEnemy(world, pos, pickEnemyKind(world.elapsed, world.rng))
    }
  } else {
    const _exhaustive: never = kind
    void _exhaustive
  }
}
