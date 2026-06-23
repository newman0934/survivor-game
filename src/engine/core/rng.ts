/**
 * Seeded 偽亂數產生器（PRNG）。
 *
 * 引擎的「確定性」基石：模擬中所有隨機行為（生怪、掉落、升級抽卡等）都必須走這裡，
 * 而非 {@link Math.random}。相同 seed 必定產生相同的數列，因此同一場遊戲可被完整重現
 * （重播、除錯、測試）。
 *
 * 演算法採用 mulberry32：32-bit 狀態、單純的整數運算，速度快、體積小，
 * 統計品質足以應付遊戲用途。不依賴 Vue/Pinia。
 */

/** Seeded 亂數產生器介面。 */
export interface Rng {
  /** 回傳 `[0, 1)` 區間的浮點亂數。 */
  next(): number
  /** 回傳 `[min, max)` 區間的浮點亂數。 */
  range(min: number, max: number): number
  /** 從陣列中隨機取一個元素。 */
  pick<T>(arr: T[]): T
}

/**
 * 建立一個以 `seed` 初始化的確定性亂數產生器。
 *
 * 演算法為 mulberry32：以一個 32-bit 內部狀態 `a` 為種子，每次呼叫先讓狀態前進一個
 * 固定常數，再經過數輪位移／互斥（XOR）與 {@link Math.imul} 混淆，最後把 32-bit 結果
 * 除以 2³²（4294967296）正規化到 `[0, 1)`。整個過程僅含整數運算，故跨平台結果一致。
 *
 * @param seed 亂數種子；相同 seed 會得到相同數列
 * @returns 具備 {@link Rng.next}、{@link Rng.range}、{@link Rng.pick} 的產生器
 */
export function createRng(seed: number): Rng {
  let a = seed >>> 0 // 強制轉成 32-bit 無號整數作為初始狀態
  const next = (): number => {
    a |= 0 // 確保以 32-bit 整數語意運算
    a = (a + 0x6d2b79f5) | 0 // 狀態前進一個固定奇數常數
    // 多輪位移 + 乘法混淆，打散位元相關性
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296 // 正規化到 [0, 1)
  }
  return {
    next,
    range: (min, max) => min + next() * (max - min),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
  }
}
