/**
 * 角色定義表（純資料）。每個可選角色的起始武器、數值、被動與顏色。
 * World 建構時依此套用起始狀態。新增角色或調數值都從這裡下手。
 */
import type { CharacterDef, CharacterKind } from '../types'

/** 選單呈現順序（預設選第一個）。 */
export const CHARACTER_ORDER: CharacterKind[] = ['warrior', 'ranger', 'mage', 'harvester']

/** 全部可選角色的定義表。 */
export const CHARACTER_DEFS: Record<CharacterKind, CharacterDef> = {
  warrior: {
    kind: 'warrior', name: '戰士', description: '高血量與護甲，穩健近戰', color: 0xff6b6b,
    maxHp: 140, startWeapon: 'wand', statMods: { armor: 3 }, startPassives: [],
  },
  ranger: {
    kind: 'ranger', name: '遊俠', description: '快攻快走，但血量薄', color: 0x6bff8c,
    maxHp: 80, startWeapon: 'knife', statMods: { moveSpeed: 240, cooldownMult: 0.9 }, startPassives: [],
  },
  mage: {
    kind: 'mage', name: '法師', description: '高傷害輸出', color: 0xb39ddb,
    maxHp: 90, startWeapon: 'bible', statMods: { damageMult: 1.25 }, startPassives: [],
  },
  harvester: {
    kind: 'harvester', name: '豐收者', description: '高吸取、起始帶皇冠（經驗加成）', color: 0xffd54a,
    maxHp: 100, startWeapon: 'garlic', statMods: { pickupRadius: 180 }, startPassives: ['crown'],
  },
}
