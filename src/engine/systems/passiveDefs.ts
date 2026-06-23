/**
 * 被動道具定義表（純資料）。
 *
 * 每種道具的顯示名稱、等級上限與「每升一級執行一次的固定增量」apply 函式。
 * 與武器不同：被動不在每格開火，而是在升級握手「選到即套用」一次增量。
 * 新增道具或調數值都從這裡下手。
 */
import type { PassiveDef, PassiveKind } from '../types'

/** 被動道具持有上限（共 10 種 → 必須取捨）。 */
export const PASSIVE_CAP = 6

/** 解鎖時提供候選的固定順序（確定性）。 */
export const PASSIVE_ORDER: PassiveKind[] = [
  'spinach', 'tome', 'bracer', 'wings', 'magnet',
  'candle', 'heart', 'tomato', 'armor', 'crown',
]

/** 全部被動道具的定義表。 */
export const PASSIVE_DEFS: Record<PassiveKind, PassiveDef> = {
  spinach: { kind: 'spinach', label: '細胞激素（傷害）', maxLevel: 5, apply: (c) => { c.stats.damageMult *= 1.1 } },
  tome: { kind: 'tome', label: '干擾素（攻速）', maxLevel: 5, apply: (c) => { c.stats.cooldownMult *= 0.92 } },
  bracer: { kind: 'bracer', label: '趨化因子（彈速）', maxLevel: 5, apply: (c) => { c.stats.projectileSpeedMult *= 1.1 } },
  wings: { kind: 'wings', label: '偽足（移速）', maxLevel: 5, apply: (c) => { c.stats.moveSpeed *= 1.08 } },
  magnet: { kind: 'magnet', label: '受體（吸取）', maxLevel: 5, apply: (c) => { c.stats.pickupRadius *= 1.15 } },
  candle: { kind: 'candle', label: '組織胺（範圍）', maxLevel: 5, apply: (c) => { c.stats.areaMult *= 1.1 } },
  heart: { kind: 'heart', label: '幹細胞（最大血）', maxLevel: 5, apply: (c) => { c.player.maxHp += 25; c.player.hp += 25 } },
  tomato: { kind: 'tomato', label: '生長因子（回復）', maxLevel: 5, apply: (c) => { c.stats.regen += 0.6 } },
  armor: { kind: 'armor', label: '細胞膜（減傷）', maxLevel: 5, apply: (c) => { c.stats.armor += 2 } },
  crown: { kind: 'crown', label: '記憶細胞（經驗）', maxLevel: 5, apply: (c) => { c.stats.xpGain += 0.15 } },
}
