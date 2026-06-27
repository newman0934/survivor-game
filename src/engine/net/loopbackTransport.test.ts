import { describe, it, expect } from 'vitest'
import { LoopbackBus, LoopbackTransport } from './loopbackTransport'
import type { PlayerInput } from './types'

const mv = (x: number, y: number): PlayerInput => ({ move: { x, y } })

describe('LoopbackTransport', () => {
  it('全員到齊才回 TickInputs', () => {
    const bus = new LoopbackBus()
    const t0 = new LoopbackTransport(bus, 2, 0)
    const t1 = new LoopbackTransport(bus, 2, 1)
    t0.sendInput(0, mv(1, 0))
    expect(t0.inputsForTick(0)).toBeNull() // 玩家 1 未到
    t1.sendInput(0, mv(-1, 0))
    const inputs = t0.inputsForTick(0)
    expect(inputs).not.toBeNull()
    expect(inputs!.length).toBe(2)
    expect(inputs![0].move.x).toBe(1)
    expect(inputs![1].move.x).toBe(-1)
  })
  it('唯讀屬性 playerCount/localIndex', () => {
    const t = new LoopbackTransport(new LoopbackBus(), 3, 2)
    expect(t.playerCount).toBe(3)
    expect(t.localIndex).toBe(2)
  })
  it('不同 tick 互不干擾', () => {
    const bus = new LoopbackBus()
    const t0 = new LoopbackTransport(bus, 1, 0)
    t0.sendInput(5, mv(1, 1))
    expect(t0.inputsForTick(0)).toBeNull()
    expect(t0.inputsForTick(5)).not.toBeNull()
  })
})
