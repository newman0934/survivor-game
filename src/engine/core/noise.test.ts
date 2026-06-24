import { describe, it, expect } from 'vitest'
import { valueNoise, fbm, ridgedFbm, cellular } from './noise'

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
  it('ridgedFbm 確定性、落在 0..1', () => {
    expect(ridgedFbm(2.2, 4.4, 5)).toBe(ridgedFbm(2.2, 4.4, 5))
    for (let i = 0; i < 30; i++) {
      const v = ridgedFbm(i * 1.1, i * 0.7, 9)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })
  it('cellular 確定性、落在 0..1', () => {
    expect(cellular(3.3, 7.7, 2)).toBe(cellular(3.3, 7.7, 2))
    for (let i = 0; i < 30; i++) {
      const v = cellular(i * 0.9, i * 1.4, 4)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })
  it('cellular period 平鋪（差一個 period 同值；浮點容差）', () => {
    expect(cellular(0.5, 0.5, 3, 8)).toBeCloseTo(cellular(8.5, 0.5, 3, 8), 6)
  })
})
