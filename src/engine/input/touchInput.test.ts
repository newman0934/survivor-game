import { describe, it, expect } from 'vitest'
import { joystickVector } from './touchInput'

describe('joystickVector', () => {
  it('死區內回零向量', () => {
    expect(joystickVector(100, 100, 105, 103, 12)).toEqual({ x: 0, y: 0 })
  })
  it('死區外回正規化單位向量（朝右）', () => {
    const v = joystickVector(100, 100, 160, 100, 12)
    expect(v.x).toBeCloseTo(1, 5)
    expect(v.y).toBeCloseTo(0, 5)
  })
  it('斜向正規化（大小約 1）', () => {
    const v = joystickVector(0, 0, 50, 50, 12)
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1, 5)
    expect(v.x).toBeCloseTo(0.7071, 3)
    expect(v.y).toBeCloseTo(0.7071, 3)
  })
  it('恰等於死區邊界視為死區內', () => {
    expect(joystickVector(0, 0, 12, 0, 12)).toEqual({ x: 0, y: 0 })
  })
})
