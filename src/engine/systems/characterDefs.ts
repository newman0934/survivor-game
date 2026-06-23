/**
 * 角色定義表（純資料）。每個可選角色的起始武器、數值、被動與顏色。
 * World 建構時依此套用起始狀態。新增角色或調數值都從這裡下手。
 */
import type { CharacterDef, CharacterKind } from '../types'

/** 選單呈現順序（預設選第一個）。 */
export const CHARACTER_ORDER: CharacterKind[] = ['macrophage', 'neutrophil', 'nkcell', 'dendritic']

/** 全部可選角色的定義表。 */
export const CHARACTER_DEFS: Record<CharacterKind, CharacterDef> = {
  macrophage: {
    kind: 'macrophage', name: '巨噬細胞', description: '高血量與護甲，穩健近戰', color: 0xff6b6b,
    maxHp: 140, startWeapon: 'antibody', statMods: { armor: 3 }, startPassives: [],
  },
  neutrophil: {
    kind: 'neutrophil', name: '嗜中性球', description: '快攻快走，但血量薄', color: 0x6bff8c,
    maxHp: 80, startWeapon: 'perforin', statMods: { moveSpeed: 240, cooldownMult: 0.9 }, startPassives: [],
  },
  nkcell: {
    kind: 'nkcell', name: 'NK 細胞', description: '高傷害輸出', color: 0xb39ddb,
    maxHp: 90, startWeapon: 'complement', statMods: { damageMult: 1.25 }, startPassives: [],
  },
  dendritic: {
    kind: 'dendritic', name: '樹突細胞', description: '高吸取、起始帶記憶細胞（經驗加成）', color: 0xffd54a,
    maxHp: 100, startWeapon: 'inflammation', statMods: { pickupRadius: 180 }, startPassives: ['crown'],
  },
}
