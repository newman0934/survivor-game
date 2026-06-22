import { describe, it, expect } from 'vitest'
import { circlesOverlap } from './collision'
import { createPlayer, createEnemy } from '../entities/factory'

describe('collision', () => {
  it('detects overlap when circles intersect', () => {
    const a = createPlayer({ x: 0, y: 0 }) // radius 14
    const b = createEnemy({ x: 20, y: 0 }) // radius 12 -> sum 26 > 20
    expect(circlesOverlap(a, b)).toBe(true)
  })
  it('reports no overlap when circles are apart', () => {
    const a = createPlayer({ x: 0, y: 0 })
    const b = createEnemy({ x: 200, y: 0 })
    expect(circlesOverlap(a, b)).toBe(false)
  })
})
