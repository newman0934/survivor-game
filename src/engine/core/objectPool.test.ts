import { describe, it, expect } from 'vitest'
import { ObjectPool } from './objectPool'

describe('ObjectPool', () => {
  it('creates new objects when empty', () => {
    let created = 0
    const pool = new ObjectPool(() => ({ id: created++ }))
    const a = pool.acquire()
    const b = pool.acquire()
    expect(a.id).toBe(0)
    expect(b.id).toBe(1)
  })
  it('reuses released objects instead of creating new ones', () => {
    let created = 0
    const pool = new ObjectPool(() => ({ id: created++ }))
    const a = pool.acquire()
    pool.release(a)
    const b = pool.acquire()
    expect(b).toBe(a)
    expect(created).toBe(1)
  })
})
