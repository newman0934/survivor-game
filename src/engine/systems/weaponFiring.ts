/**
 * 武器開火系統：每格為每位存活玩家更新各自武器（投射型/場域型/連鎖/範圍）與聖經環繞物。
 * 無狀態函式，操作傳入的 World 資料；瞄準各玩家最近敵人、用各自 stats 結算傷害與特效。
 */
import type { World } from '../World'
import type { Weapon, WeaponLevelStats, PlayerState } from '../types'
import { createOrbit } from '../entities/factory'
import { MAX_ENEMY_RADIUS } from './defs/enemyDefs'
import { WEAPON_DEFS } from './defs/weaponDefs'
import { fireWand, fireKnife, orbitPositions, garlicTick,
  phagocyteSweep, chainTargets, novaBurst, PHAGOCYTE_HALF_ANGLE, CASCADE_FALLOFF } from './weapons'
import { checkKills } from './enemyDeath'

/** 取武器的生效數值：進化則用 evolution.level，否則用當前等級值。 */
function effectiveLevel(weapon: Weapon): WeaponLevelStats {
  const def = WEAPON_DEFS[weapon.kind]
  return weapon.evolved && def.evolution ? def.evolution.level : def.levels[weapon.level - 1]
}

/**
 * 更新所有存活玩家的武器（含開火與命中結算）與聖經環繞物。
 * 順序：先處理全體玩家的武器，再處理全體玩家的聖經（與原 step §4 / §4b 等價）。
 */
export function updateWeapons(world: World, dt: number): void {
  // 4) 武器：每位存活玩家各自的武器，瞄準離自己最近的敵人、用自己 stats 開火。
  for (const p of world.livingPlayers()) {
    for (const weapon of p.weapons) {
      const def = WEAPON_DEFS[weapon.kind]
      const lvl = effectiveLevel(weapon)
      const evo = weapon.evolved ? def.evolution : undefined
      const damage = lvl.damage * p.stats.damageMult

      if (weapon.kind === 'antibody' || weapon.kind === 'perforin') {
        weapon.cooldownTimer -= dt
        if (weapon.cooldownTimer <= 0) {
          weapon.cooldownTimer = (lvl.cooldown ?? 0.5) * p.stats.cooldownMult
          const speed = (lvl.projectileSpeed ?? 400) * p.stats.projectileSpeedMult
          const count = lvl.count ?? 1
          const projs =
            weapon.kind === 'antibody'
              ? fireWand(p.entity.pos, world.enemies, count, damage, speed)
              : fireKnife(p.entity.pos, p.lastMoveDir, count, damage, speed)
          if (evo) {
            for (const proj of projs) {
              proj.evolved = true
              if (evo.pierce) { proj.pierce = evo.pierce; proj.hitEnemies = [] }
            }
          }
          world.projectiles.push(...projs)
          if (projs.length > 0) world.pushSound('shoot')
        }
      } else if (weapon.kind === 'inflammation') {
        // 大蒜：每格對範圍內敵人連續扣血（dmg*dt），命中後結算死亡。
        const radius = (lvl.radius ?? 70) * p.stats.areaMult
        const cands = world.enemyGrid.queryRadius(
          p.entity.pos.x, p.entity.pos.y, radius + MAX_ENEMY_RADIUS,
        )
        garlicTick(p.entity.pos, cands, radius, damage, dt)
        if (evo?.fieldRegen && p.entity.hp > 0) {
          p.entity.hp = Math.min(p.entity.maxHp, p.entity.hp + evo.fieldRegen * dt)
        }
        checkKills(world)
      } else if (weapon.kind === 'phagocyte') {
        weapon.cooldownTimer -= dt
        if (weapon.cooldownTimer <= 0) {
          weapon.cooldownTimer = (lvl.cooldown ?? 0.7) * p.stats.cooldownMult
          const radius = (lvl.radius ?? 70) * p.stats.areaMult
          const cands = world.enemyGrid.queryRadius(
            p.entity.pos.x, p.entity.pos.y, radius + MAX_ENEMY_RADIUS,
          )
          const halfAngle = evo?.halfAngle ?? PHAGOCYTE_HALF_ANGLE
          const hits = phagocyteSweep(p.entity.pos, p.lastMoveDir, cands, radius, halfAngle, damage)
          if (hits.length > 0) {
            checkKills(world)
            world.pushSound('hit')
            world.pushFx({
              kind: 'sweep', x: p.entity.pos.x, y: p.entity.pos.y,
              angle: Math.atan2(p.lastMoveDir.y, p.lastMoveDir.x), radius, halfAngle,
            })
          }
        }
      } else if (weapon.kind === 'cascade') {
        weapon.cooldownTimer -= dt
        if (weapon.cooldownTimer <= 0) {
          weapon.cooldownTimer = (lvl.cooldown ?? 1.0) * p.stats.cooldownMult
          const jumps = lvl.count ?? 3
          const range = (lvl.radius ?? 160) * p.stats.areaMult
          const targets = chainTargets(p.entity.pos, world.enemies, jumps, range)
          if (targets.length > 0) {
            const falloff = evo?.noFalloff ? 1 : CASCADE_FALLOFF
            for (let k = 0; k < targets.length; k++) targets[k].hp -= damage * Math.pow(falloff, k)
            checkKills(world)
            world.pushSound('hit')
            world.pushFx({
              kind: 'chain',
              points: [{ x: p.entity.pos.x, y: p.entity.pos.y }, ...targets.map((t) => ({ x: t.pos.x, y: t.pos.y }))],
            })
          }
        }
      } else if (weapon.kind === 'nova') {
        weapon.cooldownTimer -= dt
        if (weapon.cooldownTimer <= 0) {
          weapon.cooldownTimer = (lvl.cooldown ?? 1.6) * p.stats.cooldownMult
          const radius = (lvl.radius ?? 120) * p.stats.areaMult
          const cands = world.enemyGrid.queryRadius(
            p.entity.pos.x, p.entity.pos.y, radius + MAX_ENEMY_RADIUS,
          )
          const hits = novaBurst(p.entity.pos, cands, radius, damage)
          if (hits.length > 0) {
            checkKills(world)
            world.pushSound('hit')
            world.pushFx({ kind: 'nova', x: p.entity.pos.x, y: p.entity.pos.y, radius })
          }
        }
      }
      // bible 的位置與命中於下方聖經步驟統一處理
    }
  }

  // 4b) 聖經：每位存活玩家各自的環繞物。
  for (const p of world.livingPlayers()) updateBibleFor(world, p, dt)
}

/**
 * 聖經（逐玩家）：依指定玩家持有的聖經重建/更新環繞物位置，並結算對敵人的命中（含 per-enemy 命中冷卻）。
 * 未持有聖經時清空該玩家的環繞物。
 */
function updateBibleFor(world: World, p: PlayerState, dt: number): void {
  const bible = p.weapons.find((w) => w.kind === 'complement')
  if (!bible) {
    p.orbitEntities = []
    return
  }
  const evo = bible.evolved ? WEAPON_DEFS.complement.evolution : undefined
  const lvl = evo ? evo.level : WEAPON_DEFS.complement.levels[bible.level - 1]
  const hitCooldown = evo?.hitCooldown ?? 0.5
  const count = lvl.count ?? 1
  const radius = (lvl.radius ?? 90) * p.stats.areaMult
  const damage = lvl.damage * p.stats.damageMult
  p.bibleAngle += (lvl.angularSpeed ?? 2.5) * dt

  // 重建環繞物數量以對齊 count，並更新位置與傷害。
  const pts = orbitPositions(p.entity.pos, count, radius, p.bibleAngle)
  if (p.orbitEntities.length !== count) {
    p.orbitEntities = pts.map((orb) => createOrbit(orb, damage))
  } else {
    for (let i = 0; i < count; i++) {
      p.orbitEntities[i].pos = pts[i]
      p.orbitEntities[i].damage = damage
    }
  }

  // 命中冷卻倒數（過期或敵人失效即移除）。
  for (const [e, t] of p.bibleHitTimers) {
    const nt = t - dt
    if (nt <= 0 || !e.active) p.bibleHitTimers.delete(e)
    else p.bibleHitTimers.set(e, nt)
  }
  // 環繞物對重疊敵人扣血（冷卻外才扣）。
  for (const orb of p.orbitEntities) {
    const cands = world.enemyGrid.queryRadius(orb.pos.x, orb.pos.y, orb.radius + MAX_ENEMY_RADIUS)
    for (const e of cands) {
      if (!e.active) continue
      if (p.bibleHitTimers.has(e)) continue
      const dx = orb.pos.x - e.pos.x
      const dy = orb.pos.y - e.pos.y
      if (Math.hypot(dx, dy) <= orb.radius + e.radius) {
        e.hp -= orb.damage
        p.bibleHitTimers.set(e, hitCooldown) // 進化縮短命中冷卻
      }
    }
  }
  checkKills(world)
}
