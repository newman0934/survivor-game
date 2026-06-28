import { describe, it, expect } from 'vitest'
import { bgHash } from './helpers'

describe('bgHash', () => {
  it('相同輸入回傳相同值（確定性）', () => {
    expect(bgHash(3, 7)).toBe(bgHash(3, 7))
    expect(bgHash(-12, 42)).toBe(bgHash(-12, 42))
  })

  it('輸出落在 [0,1) 區間', () => {
    for (let x = -50; x < 50; x++) {
      for (let y = -50; y < 50; y++) {
        const v = bgHash(x, y)
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThan(1)
      }
    }
  })

  it('不同座標分布分散（粗略均勻，無空桶）', () => {
    const buckets = new Array(10).fill(0)
    for (let x = 0; x < 100; x++) {
      for (let y = 0; y < 100; y++) {
        buckets[Math.floor(bgHash(x, y) * 10)]++
      }
    }
    // 10000 樣本 / 10 桶 期望各 ~1000；要求每桶 > 500（遠離空桶/全集中）
    for (const b of buckets) expect(b).toBeGreaterThan(500)
  })
})
