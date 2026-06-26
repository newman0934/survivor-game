/**
 * 精英詞綴定義表（純資料）。每個詞綴的數值乘區、回血、死亡爆炸與光環色。
 * 新增詞綴或調數值都從這裡下手。
 */
import type { EliteAffix, EliteAffixDef } from '../types'

/** 確定性迭代/抽選用的固定順序。 */
export const ELITE_AFFIX_ORDER: EliteAffix[] = ['giant', 'frenzy', 'regen', 'volatile']

/** 全部詞綴定義表。 */
export const ELITE_AFFIX_DEFS: Record<EliteAffix, EliteAffixDef> = {
  giant: { affix: 'giant', name: '巨大化', auraColor: 0xff8a3d, hpMult: 3.0, radiusMult: 1.6, speedMult: 0.8, damageMult: 1.0, regenPerSec: 0, explodeOnDeath: false },
  frenzy: { affix: 'frenzy', name: '狂暴', auraColor: 0xff4d4d, hpMult: 1.0, radiusMult: 1.0, speedMult: 1.5, damageMult: 1.3, regenPerSec: 0, explodeOnDeath: false },
  regen: { affix: 'regen', name: '再生', auraColor: 0x5bff8c, hpMult: 1.0, radiusMult: 1.0, speedMult: 1.0, damageMult: 1.0, regenPerSec: 0.04, explodeOnDeath: false },
  volatile: { affix: 'volatile', name: '爆裂', auraColor: 0xffd54a, hpMult: 1.0, radiusMult: 1.0, speedMult: 1.0, damageMult: 1.0, regenPerSec: 0, explodeOnDeath: true },
}
