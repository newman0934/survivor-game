/**
 * 武器定義表（純資料）。
 *
 * 每把武器的等級上限與逐級生效數值；`levels[level-1]` 為該等級的生效值。
 * 新增武器或調整數值都從這裡下手（見 CLAUDE.md「新增敵人/武器」）。
 */
import type { WeaponDef, WeaponKind } from '../types'

/** 解鎖時提供候選的順序（antibody 為起始武器，恆持有）。 */
export const WEAPON_ORDER: WeaponKind[] = ['antibody', 'perforin', 'complement', 'inflammation',
  'phagocyte', 'cascade', 'nova']

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
    evolution: {
      requires: 'tome', label: '抗體風暴',
      level: { cooldown: 0.12, damage: 12, count: 5, projectileSpeed: 500 },
    },
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
    evolution: {
      requires: 'bracer', label: '千刃穿孔',
      level: { cooldown: 0.12, damage: 8, count: 5, projectileSpeed: 750 },
      pierce: 3,
    },
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
    evolution: {
      requires: 'spinach', label: '終末補體複合體',
      level: { damage: 12, count: 6, radius: 150, angularSpeed: 4.5 },
    },
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
    evolution: {
      requires: 'tomato', label: '自體炎症風暴',
      level: { damage: 16, radius: 170 },
      fieldRegen: 1.5,
    },
  },
  phagocyte: {
    kind: 'phagocyte', label: '吞噬偽足', maxLevel: 5,
    levels: [
      { cooldown: 0.7, damage: 8, radius: 70 },
      { cooldown: 0.7, damage: 12, radius: 70 },
      { cooldown: 0.6, damage: 12, radius: 85 },
      { cooldown: 0.6, damage: 16, radius: 85 },
      { cooldown: 0.5, damage: 20, radius: 100 },
    ],
    evolution: {
      requires: 'wings', label: '巨噬吞噬漩渦',
      level: { cooldown: 0.3, damage: 30, radius: 130 },
      halfAngle: Math.PI,
    },
  },
  cascade: {
    kind: 'cascade', label: '補體級聯', maxLevel: 5,
    levels: [
      { cooldown: 1.0, damage: 10, count: 3, radius: 160 },
      { cooldown: 1.0, damage: 10, count: 4, radius: 160 },
      { cooldown: 0.85, damage: 14, count: 4, radius: 180 },
      { cooldown: 0.85, damage: 14, count: 5, radius: 180 },
      { cooldown: 0.7, damage: 18, count: 6, radius: 200 },
    ],
    evolution: {
      requires: 'candle', label: '補體爆發級聯',
      level: { cooldown: 0.45, damage: 24, count: 9, radius: 260 },
      noFalloff: true,
    },
  },
  nova: {
    kind: 'nova', label: '抗原脈衝', maxLevel: 5,
    levels: [
      { cooldown: 1.6, damage: 12, radius: 120 },
      { cooldown: 1.6, damage: 12, radius: 150 },
      { cooldown: 1.4, damage: 18, radius: 150 },
      { cooldown: 1.4, damage: 18, radius: 180 },
      { cooldown: 1.2, damage: 26, radius: 210 },
    ],
    evolution: {
      requires: 'magnet', label: '抗原超載脈衝',
      level: { cooldown: 0.8, damage: 40, radius: 300 },
    },
  },
}
