import { describe, it, expect } from 'vitest'
import { World } from '../World'
import { LoopbackBus, LoopbackTransport } from './loopbackTransport'
import { LockstepRunner } from './lockstep'
import type { PlayerInput } from './types'

const mv = (x: number, y: number): PlayerInput => ({ move: { x, y } })

describe('LockstepRunner', () => {
  it('兩 runner 經共享 bus 每 tick checksum 完全相同', () => {
    const bus = new LoopbackBus()
    const w0 = new World(42, ['macrophage', 'neutrophil'])
    const w1 = new World(42, ['macrophage', 'neutrophil'])
    const r0 = new LockstepRunner(w0, new LoopbackTransport(bus, 2, 0))
    const r1 = new LockstepRunner(w1, new LoopbackTransport(bus, 2, 1))
    for (let f = 0; f < 200; f++) {
      r0.submitLocalInput(mv(f % 2 ? 1 : -1, 0))
      r1.submitLocalInput(mv(0, f % 3 ? 1 : -1))
      while (r0.tryAdvance()) { /* 推到底 */ }
      while (r1.tryAdvance()) { /* 推到底 */ }
      expect(r0.getCurrentTick()).toBe(r1.getCurrentTick())
      expect(r0.checksum()).toBe(r1.checksum())
    }
  })

  it('缺輸入時 tryAdvance 停滯、到齊後恢復', () => {
    const bus = new LoopbackBus()
    const w = new World(1, ['macrophage', 'neutrophil'])
    const r0 = new LockstepRunner(w, new LoopbackTransport(bus, 2, 0))
    const t1 = new LoopbackTransport(bus, 2, 1)
    expect(r0.tryAdvance()).toBe(false) // tick0 缺玩家 1
    t1.sendInput(0, mv(0, 0))
    t1.sendInput(1, mv(0, 0))
    expect(r0.tryAdvance()).toBe(true)  // tick0 到齊
    expect(r0.getCurrentTick()).toBe(1)
  })

  it('inputDelay=2：本地輸入於 tick+2 套用', () => {
    const bus = new LoopbackBus()
    const w = new World(1) // 單人 playerCount 1
    const r = new LockstepRunner(w, new LoopbackTransport(bus, 1, 0), 2)
    const x0 = w.players[0].entity.pos.x
    r.submitLocalInput(mv(1, 0)) // → tick 2
    expect(r.tryAdvance()).toBe(true) // tick0（中性預送）
    expect(r.tryAdvance()).toBe(true) // tick1（中性預送）
    expect(w.players[0].entity.pos.x).toBe(x0) // 前兩 tick 未移動
    expect(r.tryAdvance()).toBe(true) // tick2（套用本地輸入）
    expect(w.players[0].entity.pos.x).toBeGreaterThan(x0)
  })

  it('pick 於該 tick 以 chooseUpgrade 套用', () => {
    const bus = new LoopbackBus()
    const w = new World(1, ['macrophage', 'neutrophil'])
    w.players[1].pendingLevelUps = 1
    const r0 = new LockstepRunner(w, new LoopbackTransport(bus, 2, 0))
    const t1 = new LoopbackTransport(bus, 2, 1)
    // 玩家 1 的預送窗（tick0,1 中性）
    t1.sendInput(0, mv(0, 0))
    t1.sendInput(1, mv(0, 0))
    expect(r0.tryAdvance()).toBe(true) // tick0 → step → processUpgrades 產生玩家1待選
    const id = w.pendingOfferFor(1)![0].id
    expect(id).toBeTruthy()
    // tick2：玩家0 中性、玩家1 帶 pick
    r0.submitLocalInput(mv(0, 0))           // 玩家0 → tick2
    t1.sendInput(2, { move: { x: 0, y: 0 }, pick: id }) // 玩家1 → tick2 帶 pick
    expect(r0.tryAdvance()).toBe(true) // tick1（中性）
    expect(r0.tryAdvance()).toBe(true) // tick2（套 pick）
    expect(w.pendingOfferFor(1)).toBeNull() // 已選定、待選清空
  })

  it('相同 seed + 相同腳本兩跑 checksum 一致', () => {
    const run = () => {
      const bus = new LoopbackBus()
      const w0 = new World(7, ['macrophage', 'neutrophil'])
      const w1 = new World(7, ['macrophage', 'neutrophil'])
      const r0 = new LockstepRunner(w0, new LoopbackTransport(bus, 2, 0))
      const r1 = new LockstepRunner(w1, new LoopbackTransport(bus, 2, 1))
      for (let f = 0; f < 120; f++) {
        r0.submitLocalInput(mv(1, 0)); r1.submitLocalInput(mv(0, 1))
        while (r0.tryAdvance()) { /* */ }
        while (r1.tryAdvance()) { /* */ }
      }
      return r0.checksum()
    }
    expect(run()).toBe(run())
  })
})
