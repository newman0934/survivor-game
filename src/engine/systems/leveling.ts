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
import type { UpgradeOption, UpgradeContext, WeaponKind, PassiveKind } from '../types'
import type { Rng } from '../core/rng'
import { WEAPON_DEFS, WEAPON_ORDER } from './weaponDefs'
import { PASSIVE_DEFS, PASSIVE_ORDER, PASSIVE_CAP } from './passiveDefs'

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

/** 武器持有上限（共 7 種武器，可全數收齊）。 */
const WEAPON_CAP = 7

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

/** 產生「解鎖某被動」選項（選到時新增 Lv1 並套用一次增量）。 */
function unlockPassiveOption(kind: PassiveKind): UpgradeOption {
  const def = PASSIVE_DEFS[kind]
  return {
    id: `passunlock:${kind}`,
    label: `新道具：${def.label}`,
    apply: (c) => {
      if (!c.passives.some((p) => p.kind === kind) && c.passives.length < PASSIVE_CAP) {
        c.passives.push({ kind, level: 1 })
        def.apply(c)
      }
    },
  }
}

/** 產生「升級某被動」選項（選到時 level+1 並再套用一次增量；label 顯示當前→下一級）。 */
function levelUpPassiveOption(kind: PassiveKind, curLevel: number): UpgradeOption {
  const def = PASSIVE_DEFS[kind]
  return {
    id: `passlvl:${kind}`,
    label: `${def.label} Lv${curLevel}→Lv${curLevel + 1}`,
    apply: (c) => {
      const p = c.passives.find((x) => x.kind === kind)
      if (p && p.level < def.maxLevel) {
        p.level += 1
        def.apply(c)
      }
    },
  }
}

/**
 * 依當前 World 狀態動態組出所有合法升級候選：
 * 解鎖/升級武器（未達上限/未滿級）＋解鎖/升級被動道具（未達上限/未滿級）。
 *
 * @param ctx 當前升級上下文（讀取 weapons / passives 與持有狀態）。
 * @returns 當下所有可被抽選的合法選項。
 */
export function buildCandidates(ctx: UpgradeContext): UpgradeOption[] {
  const out: UpgradeOption[] = []
  const ownedW = new Set(ctx.weapons.map((w) => w.kind))
  if (ctx.weapons.length < WEAPON_CAP) {
    for (const kind of WEAPON_ORDER) {
      if (!ownedW.has(kind)) out.push(unlockOption(kind))
    }
  }
  for (const w of ctx.weapons) {
    if (w.level < WEAPON_DEFS[w.kind].maxLevel) out.push(levelUpOption(w.kind, w.level))
  }
  const ownedP = new Set(ctx.passives.map((p) => p.kind))
  if (ctx.passives.length < PASSIVE_CAP) {
    for (const kind of PASSIVE_ORDER) {
      if (!ownedP.has(kind)) out.push(unlockPassiveOption(kind))
    }
  }
  for (const p of ctx.passives) {
    if (p.level < PASSIVE_DEFS[p.kind].maxLevel) out.push(levelUpPassiveOption(p.kind, p.level))
  }
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
  if (id.startsWith('unlock:')) return unlockOption(id.slice(7) as WeaponKind).apply(ctx)
  if (id.startsWith('levelup:')) {
    const kind = id.slice(8) as WeaponKind
    const w = ctx.weapons.find((x) => x.kind === kind)
    return levelUpOption(kind, w ? w.level : 1).apply(ctx)
  }
  if (id.startsWith('passunlock:')) return unlockPassiveOption(id.slice(11) as PassiveKind).apply(ctx)
  if (id.startsWith('passlvl:')) {
    const kind = id.slice(8) as PassiveKind
    const p = ctx.passives.find((x) => x.kind === kind)
    return levelUpPassiveOption(kind, p ? p.level : 1).apply(ctx)
  }
  // 未知 id：安靜略過
}
