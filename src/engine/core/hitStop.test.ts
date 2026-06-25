import { describe, it, expect } from 'vitest'
import { HitStop } from './hitStop'

describe('HitStop', () => {
  it('trigger 後 stopped 為真', () => {
    const h = new HitStop()
    h.trigger(0.1)
    expect(h.stopped).toBe(true)
  })
  it('advance 推進到期後 stopped 轉假', () => {
    const h = new HitStop()
    h.trigger(0.05)
    h.advance(0.03)
    expect(h.stopped).toBe(true)
    h.advance(0.03)
    expect(h.stopped).toBe(false)
  })
  it('冷卻內第二次 trigger 被忽略', () => {
    const h = new HitStop()
    h.trigger(0.05)
    h.advance(0.06) // 凍結到期，但冷卻(0.35)未到
    expect(h.stopped).toBe(false)
    h.trigger(0.05) // 冷卻內 → 忽略
    expect(h.stopped).toBe(false)
  })
  it('冷卻過後可再次 trigger', () => {
    const h = new HitStop()
    h.trigger(0.05)
    h.advance(0.4) // 超過冷卻 0.35
    h.trigger(0.05)
    expect(h.stopped).toBe(true)
  })
})
