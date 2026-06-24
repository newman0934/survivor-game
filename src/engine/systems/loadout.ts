/**
 * 持有/進化狀態 system（純函式）。
 *
 * 提供 UI 顯示「目前持有」與進化提示所需的純邏輯：判定某武器的進化狀態。
 * 判定條件與 leveling.buildCandidates 一致（滿級 + 持有指定被動）。純 TS、無 Vue/Pinia。
 */
import type { WeaponKind, PassiveKind } from '../types'
import { WEAPON_DEFS } from './weaponDefs'

/** 武器進化狀態：已進化 / 可進化 / 尚未滿足。 */
export type EvolutionStatus = 'evolved' | 'ready' | 'pending'

/**
 * 判定一把武器的進化狀態。
 * @param weapon        武器（kind/level/evolved）。
 * @param ownedPassives 玩家持有的被動種類清單。
 * @returns 'evolved'（已進化）/ 'ready'（滿級且持有所需被動）/ 'pending'（其餘）。
 */
export function evolutionStatus(
  weapon: { kind: WeaponKind; level: number; evolved?: boolean },
  ownedPassives: PassiveKind[],
): EvolutionStatus {
  if (weapon.evolved) return 'evolved'
  const def = WEAPON_DEFS[weapon.kind]
  const evo = def.evolution
  if (!evo) return 'pending'
  const maxed = weapon.level >= def.maxLevel
  return maxed && ownedPassives.includes(evo.requires) ? 'ready' : 'pending'
}
