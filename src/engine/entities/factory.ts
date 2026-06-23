/**
 * Entity 工廠。
 *
 * 集中建立各種 entity（player / enemy / projectile / gem），統一基礎數值。
 * 所有函式皆回傳全新的純資料 `Entity`（不共用參照），確保確定性與安全。
 * 調整基礎手感／數值多半從這裡下手。
 */
import type { Vec2 } from '../core/vector'
import type { Entity, EnemyKind } from '../types'
import { ENEMY_DEFS } from '../systems/enemyDefs'

/** 共用的 entity 基底；各工廠以此為底再覆寫專屬欄位（避免漏填欄位）。 */
const base = (): Entity => ({
  kind: 'enemy',
  active: true,
  pos: { x: 0, y: 0 },
  vel: { x: 0, y: 0 },
  radius: 10,
  hp: 1,
  maxHp: 1,
  speed: 0,
  damage: 0,
  life: 0,
  xp: 0,
})

/**
 * 建立玩家 entity。
 * @param pos 初始位置（會被複製，不共用參照）。
 * @returns 新的 player entity。
 */
export function createPlayer(pos: Vec2): Entity {
  return { ...base(), kind: 'player', pos: { ...pos }, radius: 14, hp: 100, maxHp: 100, speed: 200 }
}

/**
 * 建立敵人 entity。
 * @param pos  生成位置（會被複製）。
 * @param kind 敵人種類（預設 'virus'）；數值取自 `ENEMY_DEFS`。
 * @returns 新的 enemy entity，帶接觸傷害、掉落經驗值與行為相位時鐘。
 */
export function createEnemy(pos: Vec2, kind: EnemyKind = 'virus'): Entity {
  const def = ENEMY_DEFS[kind]
  return {
    ...base(),
    kind: 'enemy',
    enemyKind: kind,
    pos: { ...pos },
    radius: def.radius,
    hp: def.hp,
    maxHp: def.hp,
    speed: def.speed,
    damage: def.damage,
    xp: def.xp,
    behaviorTimer: 0,
  }
}

/**
 * 建立 projectile entity。
 * @param pos 發射起點（會被複製）。
 * @param dir 單位方向向量（呼叫端需先正規化）。
 * @param speed 飛行速度，與 `dir` 相乘成為 `vel`。
 * @param damage 命中造成的傷害。
 * @returns 新的 projectile entity，`life` 預設 1.5 秒後自動失效。
 */
export function createProjectile(pos: Vec2, dir: Vec2, speed: number, damage: number): Entity {
  return {
    ...base(),
    kind: 'projectile',
    pos: { ...pos },
    vel: { x: dir.x * speed, y: dir.y * speed },
    radius: 5,
    hp: 1,
    maxHp: 1,
    damage,
    life: 1.5,
  }
}

/**
 * 建立經驗寶石 entity。
 * @param pos 掉落位置（會被複製）。
 * @param xp 拾取時給予的經驗值。
 * @returns 新的 gem entity。
 */
export function createGem(pos: Vec2, xp: number): Entity {
  return { ...base(), kind: 'gem', pos: { ...pos }, radius: 6, xp }
}

/**
 * 建立聖經環繞物 entity。
 * 位置由 `weapons.orbitPositions` 每格重算後寫入，不走 movement system（vel 恆為 0）。
 * @param pos    初始位置（會被複製）。
 * @param damage 接觸敵人時造成的傷害。
 * @returns 新的 orbit entity。
 */
export function createOrbit(pos: Vec2, damage: number): Entity {
  return { ...base(), kind: 'orbit', pos: { ...pos }, radius: 12, damage }
}

/**
 * 建立寶箱 entity（Boss 死亡掉落）。
 * @param pos 掉落位置（會被複製）。
 * @returns 新的 chest entity。
 */
export function createChest(pos: Vec2): Entity {
  return { ...base(), kind: 'chest', pos: { ...pos }, radius: 14 }
}
