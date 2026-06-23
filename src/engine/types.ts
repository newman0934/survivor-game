/**
 * 引擎共用型別定義。
 *
 * 此檔只放純資料型別，供整個 `engine/**` 共用：ECS 中的 entity 形狀、
 * 玩家可被升級調整的數值（`PlayerStats`），以及升級選項描述（`UpgradeOption`）。
 * 屬於架構中「entity = 純資料」的部分，不含任何行為邏輯。
 */
import type { Vec2 } from './core/vector'

/** entity 的種類標籤；renderer 依此決定顏色，system 依此決定行為。 */
export type EntityKind = 'player' | 'enemy' | 'projectile' | 'gem'

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
}

/**
 * 玩家可被升級強化的數值集合。
 *
 * 由 `World.stats` 持有；升級透過 `UpgradeOption.apply` 直接改寫此物件的欄位。
 */
export interface PlayerStats {
  /** 玩家移動速度（單位／秒）。 */
  moveSpeed: number
  /** 兩次開火之間的冷卻秒數。 */
  fireCooldown: number // seconds between shots
  /** 每發 projectile 的傷害。 */
  projectileDamage: number
  /** projectile 飛行速度。 */
  projectileSpeed: number
  /** 經驗寶石被吸取的感應半徑。 */
  pickupRadius: number
}

/**
 * 一個升級選項。
 *
 * 在 `systems/leveling.ts` 的 `ALL_UPGRADES` 定義；UI 只會看到 `id` 與 `label`，
 * 實際效果由 `apply` 對 `PlayerStats` 就地修改。
 */
export interface UpgradeOption {
  /** 穩定識別碼，升級握手時用來指回此選項。 */
  id: string
  /** 顯示給玩家看的名稱。 */
  label: string
  /**
   * 套用此升級效果。
   * @param stats 會被就地修改的玩家數值。
   */
  apply: (stats: PlayerStats) => void
}
