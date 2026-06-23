/**
 * 2D 向量運算工具。
 *
 * 引擎最底層的純函式模組之一，提供遊戲模擬中所有位置／速度／方向計算的基礎。
 * 所有函式皆為無副作用的純函式，回傳「全新的 {@link Vec2} 物件」而非就地修改輸入，
 * 以保持資料不可變、避免難以追蹤的別名（aliasing）錯誤。
 *
 * 不依賴 Vue/Pinia，可安全地在純 TS 引擎內任意使用。
 */

/** 二維向量，可表示位置、位移、速度或方向。 */
export interface Vec2 {
  x: number
  y: number
}

/**
 * 向量相加（逐分量）。
 * @param a 第一個向量
 * @param b 第二個向量
 * @returns 新向量 `{ a.x + b.x, a.y + b.y }`
 */
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y })

/**
 * 向量相減（逐分量），結果為「從 b 指向 a」的位移。
 * @param a 被減向量
 * @param b 減向量
 * @returns 新向量 `{ a.x - b.x, a.y - b.y }`
 */
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y })

/**
 * 向量純量縮放。
 * @param a 來源向量
 * @param s 縮放係數
 * @returns 新向量 `{ a.x * s, a.y * s }`
 */
export const scale = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s })

/**
 * 向量長度（模長）。
 * @param a 來源向量
 * @returns `√(x² + y²)`，使用 {@link Math.hypot} 避免溢位／精度問題
 */
export const length = (a: Vec2): number => Math.hypot(a.x, a.y)

/**
 * 兩點之間的歐幾里得距離。
 * @param a 第一個點
 * @param b 第二個點
 * @returns 兩點距離
 */
export const distance = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y)

/**
 * 將向量正規化為單位向量（長度為 1），常用於取得純方向。
 * @param a 來源向量
 * @returns 同方向的單位向量；零向量則回傳 `{ 0, 0 }` 以避免除以零
 */
export const normalize = (a: Vec2): Vec2 => {
  const len = length(a)
  if (len === 0) return { x: 0, y: 0 } // 零向量沒有方向，直接回傳零向量避免 NaN
  return { x: a.x / len, y: a.y / len }
}
