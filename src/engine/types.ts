/**
 * 引擎共用型別定義。
 *
 * 此檔只放純資料型別，供整個 `engine/**` 共用：ECS 中的 entity 形狀、
 * 玩家可被升級調整的數值（`PlayerStats`），以及升級選項描述（`UpgradeOption`）。
 * 屬於架構中「entity = 純資料」的部分，不含任何行為邏輯。
 */
import type { Vec2 } from './core/vector'

/** entity 的種類標籤；renderer 依此決定顏色，system 依此決定行為。 */
export type EntityKind = 'player' | 'enemy' | 'projectile' | 'gem' | 'orbit' | 'chest'

/** 由 World 發射、供音訊層解讀的語意事件。 */
export type SoundEvent = 'shoot' | 'hit' | 'kill' | 'pickup' | 'levelup' | 'hurt' | 'boss' | 'chest'

/** 敵人子種類；僅 kind==='enemy' 的 entity 使用，決定數值/顏色/行為。 */
export type EnemyKind = 'virus' | 'bacteria' | 'spore' | 'spiral' | 'superbug'

/**
 * ECS 中的單一 entity（純資料）。
 *
 * 同一份結構描述所有種類的物件；不同種類只會用到其中部分欄位（見各欄位註解）。
 * 行為一律由無狀態的 system 函式對這些資料運算，entity 本身不帶方法。
 */
export interface Entity {
  /** 種類標籤，決定行為與渲染顏色。 */
  kind: EntityKind
  /** 是否存活；`World.step()` 結尾會以 `active` 篩除死掉的 entity。 */
  active: boolean
  /** 世界座標位置。 */
  pos: Vec2
  /** 速度向量（單位／秒）；movement system 依 dt 套用。 */
  vel: Vec2
  /** 碰撞圓半徑。 */
  radius: number
  /** 目前生命值。 */
  hp: number
  /** 最大生命值。 */
  maxHp: number
  /** 移動速度（敵人用；玩家移動速度走 `PlayerStats.moveSpeed`）。 */
  speed: number
  /** 接觸／命中造成的傷害（projectile/enemy 用）。 */
  damage: number
  /** projectile 存活秒數（倒數）；其他種類忽略。 */
  life: number
  /** gem 的經驗值；其他種類忽略。 */
  xp: number
  /** 敵人子種類（僅敵人使用）；決定數值/顏色/行為。 */
  enemyKind?: EnemyKind
  /** charger 行為相位時鐘（秒）；其他敵種忽略。 */
  behaviorTimer?: number
}

/**
 * 玩家可被升級強化的數值集合。
 *
 * 由 `World.stats` 持有；升級透過 `UpgradeOption.apply` 直接改寫此物件的欄位。
 * 戰鬥相關數值改為「全域乘區」，與各武器的等級值相乘後得到生效值，因此能同時影響所有武器。
 */
export interface PlayerStats {
  /** 玩家移動速度（單位／秒）。 */
  moveSpeed: number
  /** 經驗寶石被吸取的感應半徑。 */
  pickupRadius: number
  /** 全域傷害乘區（預設 1）。 */
  damageMult: number
  /** 全域冷卻乘區（預設 1，越小攻速越快）。 */
  cooldownMult: number
  /** 全域彈速乘區（預設 1）。 */
  projectileSpeedMult: number
  /** 全域範圍乘區（預設 1，影響 bible/garlic 半徑）。 */
  areaMult: number
  /** 每秒回血量（hp/秒）；初值 0。 */
  regen: number
  /** 接觸傷害的固定減傷值；初值 0。 */
  armor: number
  /** 經驗獲得乘區；初值 1。 */
  xpGain: number
}

/** 武器種類。 */
export type WeaponKind = 'antibody' | 'perforin' | 'complement' | 'inflammation'

/**
 * 一把武器的執行期狀態（純資料，存於 `World.weapons`）。
 * 每把武器各自持有冷卻計時器與等級，於 `World.step()` 各自結算、互不覆蓋。
 */
export interface Weapon {
  /** 武器種類，決定開火行為與等級表。 */
  kind: WeaponKind
  /** 目前等級（1..maxLevel）。 */
  level: number
  /** 各自的開火倒數計時器（秒）。 */
  cooldownTimer: number
}

/**
 * 某把武器某一等級的生效參數（離散、逐級固定）。
 * 不同武器只用到其中部分欄位（見各欄位註解）。
 */
export interface WeaponLevelStats {
  /** 開火冷卻（秒）；garlic/bible 省略。 */
  cooldown?: number
  /** 單次／單發傷害。 */
  damage: number
  /** 投射物或環繞物數量。 */
  count?: number
  /** projectile 飛行速度（wand/knife）。 */
  projectileSpeed?: number
  /** bible 環繞半徑 / garlic 場域半徑。 */
  radius?: number
  /** bible 角速度（弧度/秒）。 */
  angularSpeed?: number
}

/**
 * 一把武器的定義：等級上限與逐級數值表。
 * `levels[level-1]` 為該等級的生效值。新增武器或調數值都從 `systems/weaponDefs.ts` 下手。
 */
export interface WeaponDef {
  /** 武器種類。 */
  kind: WeaponKind
  /** 顯示名稱（繁中）。 */
  label: string
  /** 等級上限。 */
  maxLevel: number
  /** 逐級數值表，長度 = maxLevel。 */
  levels: WeaponLevelStats[]
}

/**
 * 升級套用時可讀寫的上下文（由 `World.upgradeContext()` 提供）。
 * 讓升級選項能同時調整全域數值、增/升武器，或補血。
 */
export interface UpgradeContext {
  /** 會被就地修改的玩家全域數值。 */
  stats: PlayerStats
  /** 玩家持有的武器陣列；可新增或調整等級。 */
  weapons: Weapon[]
  /** 玩家持有的被動道具；可新增或升級。 */
  passives: Passive[]
  /** 玩家 entity（供 heart 道具直接調整 maxHp/hp）。 */
  player: Entity
  /** 補血保底卡用；就地調整玩家 hp（夾上限）。 */
  heal: (amount: number) => void
}

/** 被動道具種類。 */
export type PassiveKind =
  | 'spinach' | 'tome' | 'bracer' | 'wings' | 'magnet'
  | 'candle' | 'heart' | 'tomato' | 'armor' | 'crown'

/** 一個被動道具的執行期狀態（純資料，存於 `World.passives`）。 */
export interface Passive {
  /** 道具種類。 */
  kind: PassiveKind
  /** 目前等級（1..maxLevel）。 */
  level: number
}

/**
 * 一種被動道具的定義。`apply(ctx)` 為每升一級執行一次的固定增量。
 * 與武器不同：被動不在每格開火，而是在升級握手「選到即套用」一次增量。
 * 在 `systems/passiveDefs.ts` 定義；調整數值從那裡下手。
 */
export interface PassiveDef {
  /** 道具種類。 */
  kind: PassiveKind
  /** 顯示名稱（繁中）。 */
  label: string
  /** 等級上限。 */
  maxLevel: number
  /** 每升一級執行一次的固定增量套用函式。 */
  apply: (ctx: UpgradeContext) => void
}

/** 可選的起始角色種類。 */
export type CharacterKind = 'warrior' | 'ranger' | 'mage' | 'harvester'

/**
 * 一個可選角色的定義（純資料）：決定起始武器、起始數值、起始被動與顏色。
 * 在 `systems/characterDefs.ts` 定義；World 建構時套用。
 */
export interface CharacterDef {
  kind: CharacterKind
  name: string
  description: string
  /** 玩家圓的顏色。 */
  color: number
  /** 起始最大血（覆寫 player.maxHp/hp）。 */
  maxHp: number
  /** 起始武器。 */
  startWeapon: WeaponKind
  /** 併入起始 PlayerStats 的部分欄位。 */
  statMods: Partial<PlayerStats>
  /** 起始就持有的被動道具（建立時各套用一次效果）。 */
  startPassives: PassiveKind[]
}

/** 可選的地圖種類。 */
export type MapKind = 'plains' | 'lava' | 'tundra'

/**
 * 一張地圖的定義（純資料）：背景視覺與難度修正。
 * 在 `systems/mapDefs.ts` 定義；World 建構時套用。
 */
export interface MapDef {
  kind: MapKind
  name: string
  description: string
  /** 畫布底色。 */
  bgColor: number
  /** 背景網格線顏色。 */
  gridColor: number
  /** 背景網格線透明度。 */
  gridAlpha: number
  /** 生怪間隔倍率（<1 = 生更快 = 更難）。 */
  spawnIntervalMult: number
  /** 敵人 hp 倍率（>1 = 更硬）。 */
  enemyHpMult: number
}

/**
 * 一個升級選項。
 *
 * 在 `systems/leveling.ts` 動態產生；UI 只會看到 `id` 與 `label`，
 * 實際效果由 `apply` 對 `UpgradeContext` 就地修改。
 */
export interface UpgradeOption {
  /** 穩定識別碼，升級握手時用來指回此選項。 */
  id: string
  /** 顯示給玩家看的名稱。 */
  label: string
  /**
   * 套用此升級效果。
   * @param ctx 會被就地修改的升級上下文（stats / weapons / heal）。
   */
  apply: (ctx: UpgradeContext) => void
}

/**
 * 一種敵人的定義（純資料）。
 *
 * 逐種數值、登場時間與生成權重；charger 另含走/衝參數。
 * 在 `systems/enemyDefs.ts` 定義；調整敵人手感從那裡下手。
 */
export interface EnemyDef {
  /** 敵人種類。 */
  kind: EnemyKind
  /** 生命值。 */
  hp: number
  /** 追擊速度（charger 為走路速）。 */
  speed: number
  /** 接觸傷害。 */
  damage: number
  /** 碰撞半徑。 */
  radius: number
  /** 擊殺掉落的經驗值。 */
  xp: number
  /** 渲染填色。 */
  color: number
  /** 自開局幾秒後才可能生成。 */
  unlockTime: number
  /** 加權隨機的權重。 */
  spawnWeight: number
  /** charger 衝刺速度。 */
  dashSpeed?: number
  /** charger 走路相時長（秒）。 */
  walkTime?: number
  /** charger 衝刺相時長（秒）。 */
  dashTime?: number
}
