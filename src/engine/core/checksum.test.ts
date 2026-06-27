import { describe, it, expect } from 'vitest'
import { Checksum } from './checksum'

describe('Checksum', () => {
  it('相同序列產生相同 value', () => {
    const a = new Checksum().add(1.5).addInt(3).add(-2.25)
    const b = new Checksum().add(1.5).addInt(3).add(-2.25)
    expect(a.value()).toBe(b.value())
  })
  it('順序敏感（交換兩數 value 不同）', () => {
    const a = new Checksum().add(1).add(2).value()
    const b = new Checksum().add(2).add(1).value()
    expect(a).not.toBe(b)
  })
  it('value 為 32-bit 無號整數', () => {
    const v = new Checksum().add(123.456).addInt(-7).value()
    expect(Number.isInteger(v)).toBe(true)
    expect(v).toBeGreaterThanOrEqual(0)
    expect(v).toBeLessThanOrEqual(0xffffffff)
  })
  it('不同輸入多半得不同 value（健全性）', () => {
    expect(new Checksum().add(1).value()).not.toBe(new Checksum().add(1.0000001).value())
  })
})
