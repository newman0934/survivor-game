/**
 * 升級 system（leveling）。
 *
 * 定義經驗曲線（升一級所需經驗）、所有可選強化的清單（ALL_UPGRADES），以及升級時
 * 從清單中隨機抽出數張卡的邏輯（rollUpgrades）。純函式 + 純資料，無狀態。
 *
 * 在升級握手流程中的角色：當玩家經驗達到 xpForLevel 的門檻，World 觸發升級，迴圈暫停並用
 * rollUpgrades 抽出候選卡推給 store 供 UI 顯示；玩家選定後由 World.applyUpgrade 呼叫對應
 * UpgradeOption 的 apply() 修改 stats，再恢復遊戲。
 */
import type { UpgradeOption, UpgradeContext, WeaponKind } from '../types'
import type { Rng } from '../core/rng'
import { WEAPON_DEFS, WEAPON_ORDER } from './weaponDefs'

/**
 * 經驗曲線：回傳從 (level-1) 升到 level 所需的經驗值總量。
 *
 * 設計意圖：採線性遞增，基礎 5 點、每級再 +5（即第 1 級 5、第 2 級 10、第 3 級 15…），
 * 讓前期升級頻繁、後期逐漸拉長，保持穩定的成長節奏。
 *
 * @param level 目標等級。
 * @returns 升到該等級所需的經驗值。
 */
export function xpForLevel(level: number): number {
  return 5 + (level - 1) * 5
}

/** 武器持有上限（本階段共 4 種，故必定能全數收齊）。 */
const WEAPON_CAP = 4

/**
 * 全域被動升級（改為乘區，同時影響所有武器的生效數值）。
 *
 * 每筆為一個 UpgradeOption：id、label、apply（就地修改 UpgradeContext.stats 的乘區）。
 */
export const PASSIVE_UPGRADES: UpgradeOption[] = [
  { id: 'damage', label: '傷害 +15%', apply: (c) => { c.stats.damageMult *= 1.15 } },
  { id: 'firerate', label: '攻速 +15%', apply: (c) => { c.stats.cooldownMult *= 0.85 } }, // 冷卻變短 = 攻速變快
  { id: 'projspeed', label: '彈速 +20%', apply: (c) => { c.stats.projectileSpeedMult *= 1.2 } },
  { id: 'movespeed', label: '移速 +12%', apply: (c) => { c.stats.moveSpeed *= 1.12 } },
  { id: 'pickup', label: '吸取範圍 +25%', apply: (c) => { c.stats.pickupRadius *= 1.25 } },
]

/** 保底卡：合法候選不足時補滿用。 */
const HEAL: UpgradeOption = { id: 'heal', label: '補血 +20', apply: (c) => c.heal(20) }

/** 產生「解鎖某武器」選項。 */
function unlockOption(kind: WeaponKind): UpgradeOption {
  return {
    id: `unlock:${kind}`,
    label: `新武器：${WEAPON_DEFS[kind].label}`,
    apply: (c) => {
      if (!c.weapons.some((w) => w.kind === kind) && c.weapons.length < WEAPON_CAP) {
        c.weapons.push({ kind, level: 1, cooldownTimer: 0 })
      }
    },
  }
}

/** 產生「升級某武器」選項（label 顯示當前→下一級）。 */
function levelUpOption(kind: WeaponKind, curLevel: number): UpgradeOption {
  const def = WEAPON_DEFS[kind]
  return {
    id: `levelup:${kind}`,
    label: `${def.label} Lv${curLevel}→Lv${curLevel + 1}`,
    apply: (c) => {
      const w = c.weapons.find((x) => x.kind === kind)
      if (w && w.level < def.maxLevel) w.level += 1
    },
  }
}

/**
 * 依當前 World 狀態動態組出所有合法升級候選：
 * 解鎖未持有武器（未達上限）＋升級未滿級武器＋全域被動。
 *
 * @param ctx 當前升級上下文（讀取 weapons 與持有狀態）。
 * @returns 當下所有可被抽選的合法選項。
 */
export function buildCandidates(ctx: UpgradeContext): UpgradeOption[] {
  const out: UpgradeOption[] = []
  const owned = new Set(ctx.weapons.map((w) => w.kind))
  if (ctx.weapons.length < WEAPON_CAP) {
    for (const kind of WEAPON_ORDER) {
      if (!owned.has(kind)) out.push(unlockOption(kind))
    }
  }
  for (const w of ctx.weapons) {
    if (w.level < WEAPON_DEFS[w.kind].maxLevel) out.push(levelUpOption(w.kind, w.level))
  }
  out.push(...PASSIVE_UPGRADES)
  return out
}

/**
 * 從合法候選中不重複地隨機抽出指定數量的選項；不足時以 heal 保底補滿。
 *
 * 用於升級時產生「N 選 1」的卡片。為維持確定性，亂數一律走傳入的 seeded rng，
 * 不可使用 Math.random。透過 splice 取出，確保同一輪不會抽到重複選項。
 *
 * @param rng   seeded 亂數產生器（確保可重現）。
 * @param count 想抽出的選項數量。
 * @param ctx   當前升級上下文，用來動態決定合法候選。
 * @returns 恰好 count 張選項（不足部分以 heal 補滿）。
 */
export function rollUpgrades(rng: Rng, count: number, ctx: UpgradeContext): UpgradeOption[] {
  const pool = buildCandidates(ctx)
  const chosen: UpgradeOption[] = []
  while (chosen.length < count && pool.length > 0) {
    const i = Math.floor(rng.next() * pool.length)
    chosen.push(pool.splice(i, 1)[0]) // 取出後從池中移除，避免重複抽到
  }
  while (chosen.length < count) chosen.push(HEAL) // 保底補滿
  return chosen
}

/**
 * 依 id 套用升級效果（升級握手最後一步）。
 *
 * 由於候選為動態產生，這裡以 id 前綴解析對應效果：heal / 被動 / unlock: / levelup:。
 * 找不到對應 id 時安靜略過（不丟例外）。
 *
 * @param id  升級選項 id。
 * @param ctx 會被就地修改的升級上下文。
 */
export function applyUpgradeById(id: string, ctx: UpgradeContext): void {
  if (id === 'heal') return HEAL.apply(ctx)
  const passive = PASSIVE_UPGRADES.find((p) => p.id === id)
  if (passive) return passive.apply(ctx)
  if (id.startsWith('unlock:')) return unlockOption(id.slice(7) as WeaponKind).apply(ctx)
  if (id.startsWith('levelup:')) {
    const kind = id.slice(8) as WeaponKind
    const w = ctx.weapons.find((x) => x.kind === kind)
    return levelUpOption(kind, w ? w.level : 1).apply(ctx)
  }
  // 未知 id：安靜略過
}
