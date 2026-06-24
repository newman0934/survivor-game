import { describe, it, expect } from 'vitest'
import { findNearest, findNearestN } from './combat'
import { createPlayer, createEnemy } from '../entities/factory'

describe('combat targeting', () => {
  it('finds the nearest active enemy', () => {
    const player = createPlayer({ x: 0, y: 0 })
    const near = createEnemy({ x: 10, y: 0 })
    const far = createEnemy({ x: 500, y: 0 })
    expect(findNearest(player.pos, [near, far])).toBe(near)
  })
  it('ignores inactive enemies', () => {
    const player = createPlayer({ x: 0, y: 0 })
    const near = createEnemy({ x: 10, y: 0 })
    near.active = false
    const far = createEnemy({ x: 500, y: 0 })
    expect(findNearest(player.pos, [near, far])).toBe(far)
  })
  it('returns null when there are no active enemies', () => {
    const player = createPlayer({ x: 0, y: 0 })
    expect(findNearest(player.pos, [])).toBeNull()
  })
  it('finds the nearest N active enemies in order', () => {
    const player = createPlayer({ x: 0, y: 0 })
    const e1 = createEnemy({ x: 10, y: 0 })
    const e2 = createEnemy({ x: 50, y: 0 })
    const e3 = createEnemy({ x: 200, y: 0 })
    const got = findNearestN(player.pos, [e3, e1, e2], 2)
    expect(got).toEqual([e1, e2])
  })
  it('findNearestN returns fewer when not enough enemies', () => {
    const player = createPlayer({ x: 0, y: 0 })
    const e1 = createEnemy({ x: 10, y: 0 })
    expect(findNearestN(player.pos, [e1], 3)).toEqual([e1])
  })
  it('findNearestN ignores inactive enemies', () => {
    const player = createPlayer({ x: 0, y: 0 })
    const e1 = createEnemy({ x: 10, y: 0 })
    const dead = createEnemy({ x: 20, y: 0 })
    dead.active = false
    const e3 = createEnemy({ x: 30, y: 0 })
    expect(findNearestN(player.pos, [e1, dead, e3], 3)).toEqual([e1, e3])
  })
  it('findNearestN breaks distance ties by array order (stable)', () => {
    const player = createPlayer({ x: 0, y: 0 })
    // a 與 b 等距（皆 100），c 較遠；取 2 應為 [a, b]（保留先到者）
    const a = createEnemy({ x: 100, y: 0 })
    const b = createEnemy({ x: 0, y: 100 })
    const c = createEnemy({ x: 0, y: 300 })
    expect(findNearestN(player.pos, [a, b, c], 2)).toEqual([a, b])
    // 反轉先後，平手順序也應反轉
    expect(findNearestN(player.pos, [b, a, c], 2)).toEqual([b, a])
  })
  it('findNearestN returns empty for n <= 0', () => {
    const player = createPlayer({ x: 0, y: 0 })
    const e1 = createEnemy({ x: 10, y: 0 })
    expect(findNearestN(player.pos, [e1], 0)).toEqual([])
  })
})
