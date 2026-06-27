/**
 * 敵人死亡與撿取物系統：擊殺結算、掉落（經驗寶石／寶箱／回血／吸取）、死亡分裂與爆炸、撿取物效果。
 * 無狀態函式，操作傳入的 World 資料；隨機走 World.pickupRng（獨立串流，維持確定性）。
 */
import type { World } from '../World'
import type { Entity, PickupKind, PlayerState } from '../types'
import type { Vec2 } from '../core/vector'
import { distance } from '../core/vector'
import { createGem, createChest, createPickup } from '../entities/factory'
import { ENEMY_DEFS } from './defs/enemyDefs'
import { ELITE_AFFIX_DEFS } from './defs/eliteDefs'
import { spawnEnemy } from './enemySpawning'

const HEAL_FRAC = 0.3            // 回血回復 maxHp 比例
const HEAL_DROP_HP_FRAC = 0.5    // 血量低於 maxHp 此比例才可能掉回血（mercy）
const HEAL_DROP_CHANCE = 0.025   // 每次擊殺掉回血機率（低血時）
const VACUUM_DROP_CHANCE = 0.012 // 每次擊殺掉全場吸取機率
const VACUUM_DURATION = 1.5      // 全場吸取持續秒數

/** 掃描敵人，凡 hp<=0 者記擊殺、掉寶並失效（供場域/環繞型武器命中後結算）。 */
export function checkKills(world: World): void {
  for (const e of world.enemies) {
    if (e.active && e.hp <= 0) killEnemy(world, e)
  }
}

/**
 * 統一處理敵人死亡：失效、記擊殺、掉經驗寶石；Boss 額外掉寶箱。
 * 分裂敵人死亡時在原地生子體；爆炸敵人死亡時對玩家造成範圍傷害並推特效。
 */
export function killEnemy(world: World, e: Entity): void {
  e.active = false
  world.kills += 1
  if (e.enemyKind === 'finalboss') world.won = true
  world.gemEntities.push(createGem(e.pos, e.xp))
  if (e.enemyKind === 'superbug' || e.affix) world.chestEntities.push(createChest(e.pos))
  world.pushSound('kill')
  maybeDropPickup(world, e.pos)
  const def = e.enemyKind ? ENEMY_DEFS[e.enemyKind] : undefined
  // 死亡分裂：在原地生 count 隻子體（小角度錯位，確定性）。
  // 子體刻意不繼承精英詞綴，避免精英分裂雪崩。
  if (def?.splitInto) {
    const { kind, count } = def.splitInto
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2
      spawnEnemy(world, { x: e.pos.x + Math.cos(a) * 14, y: e.pos.y + Math.sin(a) * 14 }, kind)
    }
  }
  // 死亡爆炸：exploder 敵種或 volatile 精英；玩家在半徑內扣血（套護甲）+ 推爆裂視覺。
  // exploder 敵種的 def.explode 數值優先於 volatile affix（?? 短路）；volatile 數值取自詞綴定義。
  const affixDef = e.affix ? ELITE_AFFIX_DEFS[e.affix] : undefined
  const explode = def?.explode
    ?? (affixDef?.explodeOnDeath ? { radius: affixDef.explodeRadius, damage: affixDef.explodeDamage } : undefined)
  if (explode) {
    const { radius, damage } = explode
    if (distance(e.pos, world.player.pos) <= radius) {
      world.player.hp -= Math.max(0, damage - world.stats.armor)
      world.pushSound('hit')
    }
    world.pushFx({ kind: 'nova', x: e.pos.x, y: e.pos.y, radius })
  }
}

/** 撿取物掉落：獨立 seeded rng；一次擊殺最多一個（heal/vacuum 互斥）；heal 僅任一存活玩家低血 mercy。 */
function maybeDropPickup(world: World, pos: Vec2): void {
  const r = world.pickupRng.next()
  const anyLow = world.players.some((p) => p.entity.hp > 0 && p.entity.hp < p.entity.maxHp * HEAL_DROP_HP_FRAC)
  if (anyLow && r < HEAL_DROP_CHANCE) {
    world.pickupEntities.push(createPickup(pos, 'heal'))
  } else if (r >= HEAL_DROP_CHANCE && r < HEAL_DROP_CHANCE + VACUUM_DROP_CHANCE) {
    world.pickupEntities.push(createPickup(pos, 'vacuum'))
  }
}

/** 套用指定玩家的撿取物效果：heal 回血（夾上限）；vacuum 啟動該玩家的全場吸取計時器。 */
export function applyPickupTo(world: World, p: PlayerState, kind: PickupKind): void {
  if (kind === 'heal') {
    p.entity.hp = Math.min(p.entity.maxHp, p.entity.hp + p.entity.maxHp * HEAL_FRAC)
  } else {
    // 全場吸取：啟動 vacuum 期間，寶石迴圈會把全部寶石加速吸向玩家、逐顆收取（保留飛行手感）。
    p.vacuumTimer = VACUUM_DURATION
  }
  world.pushSound('pickup')
}
