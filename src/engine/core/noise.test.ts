import { describe, it, expect } from 'vitest'
import { valueNoise, fbm } from './noise'

describe('noise', () => {
  it('fbm 相同 (x,y,seed) 可重現', () => {
    expect(fbm(3.7, 9.2, 42)).toBe(fbm(3.7, 9.2, 42))
  })
  it('fbm 輸出落在 0..1', () => {
    for (let i = 0; i < 50; i++) {
      const v = fbm(i * 1.3, i * 2.7, 7)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })
  it('不同 seed 一般產生不同值', () => {
    expect(fbm(2.5, 2.5, 1)).not.toBe(fbm(2.5, 2.5, 999))
  })
  it('valueNoise 0..1 且可重現', () => {
    const a = valueNoise(5.5, 8.1, 3)
    expect(a).toBe(valueNoise(5.5, 8.1, 3))
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThanOrEqual(1)
  })
  it('period 使格點環繞（平鋪）', () => {
    // 同 seed、座標差一個 period 的整數格點應雜湊到同值
    expect(valueNoise(0, 0, 5, 8)).toBe(valueNoise(8, 0, 5, 8))
  })
})
