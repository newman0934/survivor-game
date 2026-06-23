/**
 * 武器定義表（純資料）。
 *
 * 每把武器的等級上限與逐級生效數值；`levels[level-1]` 為該等級的生效值。
 * 新增武器或調整數值都從這裡下手（見 CLAUDE.md「新增敵人/武器」）。
 */
import type { WeaponDef, WeaponKind } from '../types'

/** 解鎖時提供候選的順序（antibody 為起始武器，恆持有）。 */
export const WEAPON_ORDER: WeaponKind[] = ['antibody', 'perforin', 'complement', 'inflammation']

/** 全部武器的等級表。 */
export const WEAPON_DEFS: Record<WeaponKind, WeaponDef> = {
  antibody: {
    kind: 'antibody',
    label: '抗體',
    maxLevel: 5,
    levels: [
      { cooldown: 0.5, damage: 5, count: 1, projectileSpeed: 400 },
      { cooldown: 0.5, damage: 8, count: 1, projectileSpeed: 400 },
      { cooldown: 0.5, damage: 8, count: 2, projectileSpeed: 400 },
      { cooldown: 0.4, damage: 8, count: 2, projectileSpeed: 400 },
      { cooldown: 0.4, damage: 8, count: 3, projectileSpeed: 400 },
    ],
  },
  perforin: {
    kind: 'perforin',
    label: '穿孔素飛鏢',
    maxLevel: 5,
    levels: [
      { cooldown: 0.35, damage: 4, count: 1, projectileSpeed: 600 },
      { cooldown: 0.35, damage: 4, count: 2, projectileSpeed: 600 },
      { cooldown: 0.35, damage: 6, count: 2, projectileSpeed: 600 },
      { cooldown: 0.28, damage: 6, count: 2, projectileSpeed: 600 },
      { cooldown: 0.28, damage: 6, count: 3, projectileSpeed: 600 },
    ],
  },
  complement: {
    kind: 'complement',
    label: '補體環',
    maxLevel: 5,
    levels: [
      { damage: 6, count: 1, radius: 90, angularSpeed: 2.5 },
      { damage: 6, count: 2, radius: 90, angularSpeed: 2.5 },
      { damage: 6, count: 2, radius: 120, angularSpeed: 2.5 },
      { damage: 6, count: 3, radius: 120, angularSpeed: 2.5 },
      { damage: 6, count: 3, radius: 120, angularSpeed: 3.25 },
    ],
  },
  inflammation: {
    kind: 'inflammation',
    label: '發炎場',
    maxLevel: 5,
    levels: [
      { damage: 3, radius: 70 },
      { damage: 3, radius: 90 },
      { damage: 5, radius: 90 },
      { damage: 5, radius: 110 },
      { damage: 8, radius: 110 },
    ],
  },
}
