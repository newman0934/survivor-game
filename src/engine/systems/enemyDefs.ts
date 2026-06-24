/**
 * 敵人定義表（純資料）。
 *
 * 每種敵人的數值、登場時間、生成權重與顏色；charger 另含走/衝參數。
 * 新增敵種或調數值都從這裡下手（見 CLAUDE.md「新增敵人」）。
 */
import type { EnemyDef, EnemyKind } from '../types'

/** 確定性迭代用的固定順序。 */
export const ENEMY_ORDER: EnemyKind[] = ['virus', 'bacteria', 'spore', 'spiral', 'superbug',
  'spitter', 'splitter', 'exploder']

/** 全部敵人的定義表。 */
export const ENEMY_DEFS: Record<EnemyKind, EnemyDef> = {
  virus: { kind: 'virus', hp: 10, speed: 60, damage: 5, radius: 12, xp: 1, color: 0xff5252, unlockTime: 0, spawnWeight: 50 },
  bacteria: { kind: 'bacteria', hp: 4, speed: 110, damage: 3, radius: 8, xp: 1, color: 0xff9d5c, unlockTime: 0, spawnWeight: 35 },
  spore: { kind: 'spore', hp: 60, speed: 35, damage: 12, radius: 20, xp: 5, color: 0x8e2b2b, unlockTime: 45, spawnWeight: 12 },
  spiral: {
    kind: 'spiral', hp: 18, speed: 45, damage: 10, radius: 13, xp: 4, color: 0xe91e63,
    unlockTime: 90, spawnWeight: 10, dashSpeed: 320, walkTime: 2.5, dashTime: 0.5,
  },
  superbug: { kind: 'superbug', hp: 220, speed: 30, damage: 20, radius: 34, xp: 50, color: 0x9c27b0, unlockTime: 0, spawnWeight: 0 },
  spitter: {
    kind: 'spitter', hp: 22, speed: 50, damage: 4, radius: 13, xp: 4, color: 0xc0ca33,
    unlockTime: 60, spawnWeight: 10, spit: { interval: 2.2, projSpeed: 180, projDamage: 8, range: 220 },
  },
  splitter: {
    kind: 'splitter', hp: 30, speed: 55, damage: 8, radius: 16, xp: 4, color: 0x26a69a,
    unlockTime: 75, spawnWeight: 9, splitInto: { kind: 'bacteria', count: 2 },
  },
  exploder: {
    kind: 'exploder', hp: 16, speed: 95, damage: 6, radius: 14, xp: 3, color: 0xfdd835,
    unlockTime: 50, spawnWeight: 12, explode: { radius: 90, damage: 18 },
  },
}
