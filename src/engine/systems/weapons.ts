/**
 * 武器行為 system（weapons）。
 *
 * 每種武器一組無狀態純函式：wand/knife 回傳要新增的 projectile；bible 計算環繞物位置；
 * garlic 就地對範圍內敵人扣傷。傳入的數值（damage/speed/radius）皆為「已套用全域乘區」的
 * 最終值（由 `World` 計算後傳入），讓本檔不需碰 `PlayerStats`。純 TS，不依賴 Vue/Pinia。
 */
import type { Entity } from '../types'
import type { Vec2 } from '../core/vector'
import { distance } from '../core/vector'
import { createProjectile } from '../entities/factory'
import { findNearestN } from './combat'

/**
 * 魔杖：鎖定最近 count 隻敵人，朝各自方向發射一發。
 *
 * @param origin 發射起點（玩家座標）。
 * @param enemies 候選敵人。
 * @param count  同時鎖定的目標數（投射物數）。
 * @param damage 已套乘區的單發傷害。
 * @param speed  已套乘區的飛行速度。
 * @returns 要加入場上的 projectile；無敵人時為空陣列。
 */
export function fireWand(
  origin: Vec2,
  enemies: Entity[],
  count: number,
  damage: number,
  speed: number,
): Entity[] {
  const targets = findNearestN(origin, enemies, count)
  return targets.map((t) => {
    const dx = t.pos.x - origin.x
    const dy = t.pos.y - origin.y
    const len = Math.hypot(dx, dy) || 1 // 防止與目標重疊時除以零
    return createProjectile(origin, { x: dx / len, y: dy / len }, speed, damage, 'antibody')
  })
}

/** 飛刀扇形展開時相鄰兩發的間隔弧度（約 10 度）。 */
const KNIFE_SPREAD = 0.18

/**
 * 飛刀：朝 dir 方向發射 count 發，多發時以小角度扇形對稱展開。
 *
 * @param origin 發射起點（玩家座標）。
 * @param dir    已正規化的方向；count 為奇數時中央那發正對 dir。
 * @param count  發射數量。
 * @param damage 已套乘區的單發傷害。
 * @param speed  已套乘區的飛行速度。
 * @returns 要加入場上的 projectile。
 */
export function fireKnife(
  origin: Vec2,
  dir: Vec2,
  count: number,
  damage: number,
  speed: number,
): Entity[] {
  const baseAngle = Math.atan2(dir.y, dir.x)
  const out: Entity[] = []
  for (let i = 0; i < count; i++) {
    // 以中央對稱展開：i 對應的角度偏移量
    const offset = (i - (count - 1) / 2) * KNIFE_SPREAD
    const a = baseAngle + offset
    out.push(createProjectile(origin, { x: Math.cos(a), y: Math.sin(a) }, speed, damage, 'perforin'))
  }
  return out
}

/**
 * 聖經：計算 count 個環繞物在以 center 為圓心、半徑 radius 的圓上的等分位置。
 *
 * @param center    圓心（玩家座標）。
 * @param count     環繞物數量。
 * @param radius    已套乘區的環繞半徑。
 * @param baseAngle 目前旋轉基準角（由 World 隨時間累加）。
 * @returns 各環繞物的世界座標。
 */
export function orbitPositions(center: Vec2, count: number, radius: number, baseAngle: number): Vec2[] {
  const pts: Vec2[] = []
  for (let i = 0; i < count; i++) {
    const a = baseAngle + (i * 2 * Math.PI) / count
    pts.push({ x: center.x + Math.cos(a) * radius, y: center.y + Math.sin(a) * radius })
  }
  return pts
}

/**
 * 大蒜：對 center 半徑內的存活敵人扣 dps*dt 連續傷害（就地修改 hp）。
 * 命中判定採「敵人中心距離 <= radius」。
 *
 * @param center  場域圓心（玩家座標）。
 * @param enemies 敵人陣列（hp 會被就地修改）。
 * @param radius  已套乘區的場域半徑。
 * @param dps     已套乘區的每秒傷害。
 * @param dt      固定步長秒數。
 */
export function garlicTick(center: Vec2, enemies: Entity[], radius: number, dps: number, dt: number): void {
  for (const e of enemies) {
    if (!e.active) continue
    if (distance(center, e.pos) <= radius) {
      e.hp -= dps * dt
    }
  }
}

/** 吞噬偽足扇形半角（弧度，70°）。 */
export const PHAGOCYTE_HALF_ANGLE = (Math.PI * 70) / 180
/** 補體級聯每跳傷害遞減係數。 */
export const CASCADE_FALLOFF = 0.75

/**
 * 吞噬偽足：對 center 半徑內、且與 dir 夾角 ≤ halfAngle 的存活敵人扣 damage（就地改 hp）。
 * @returns 被命中的敵人（供結算/視覺）。
 */
export function phagocyteSweep(
  center: Vec2, dir: Vec2, enemies: Entity[], radius: number, halfAngle: number, damage: number,
): Entity[] {
  const base = Math.atan2(dir.y, dir.x)
  const hits: Entity[] = []
  for (const e of enemies) {
    if (!e.active) continue
    const dx = e.pos.x - center.x
    const dy = e.pos.y - center.y
    const d = Math.hypot(dx, dy)
    if (d > radius) continue
    if (d > 0) {
      let diff = Math.abs(Math.atan2(dy, dx) - base)
      if (diff > Math.PI) diff = 2 * Math.PI - diff
      if (diff > halfAngle) continue
    }
    e.hp -= damage
    hits.push(e)
  }
  return hits
}

/**
 * 補體級聯：從距 origin 最近的存活敵人起跳，之後每次跳到距上一命中點最近、未命中過、
 * 且距離 ≤ jumpRange 的敵人，最多 maxJumps 個。不在此扣血（由 World 套遞減）。
 * @returns 依序命中的敵人（確定性：距離排序、平手以陣列順序）。
 */
export function chainTargets(origin: Vec2, enemies: Entity[], maxJumps: number, jumpRange: number): Entity[] {
  const hits: Entity[] = []
  const used = new Set<Entity>()
  let from = origin
  while (hits.length < maxJumps) {
    let best: Entity | null = null
    let bestD = Infinity
    for (const e of enemies) {
      if (!e.active || used.has(e)) continue
      const d = distance(from, e.pos)
      if (d <= jumpRange && d < bestD) { bestD = d; best = e }
    }
    if (!best) break
    used.add(best)
    hits.push(best)
    from = best.pos
  }
  return hits
}

/**
 * 抗原脈衝：對 center 半徑內所有存活敵人扣 damage（就地改 hp）。
 * @returns 被命中的敵人。
 */
export function novaBurst(center: Vec2, enemies: Entity[], radius: number, damage: number): Entity[] {
  const hits: Entity[] = []
  for (const e of enemies) {
    if (!e.active) continue
    if (distance(center, e.pos) <= radius) { e.hp -= damage; hits.push(e) }
  }
  return hits
}
