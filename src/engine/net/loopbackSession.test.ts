import { describe, it, expect, vi } from 'vitest'
import { LoopbackSession } from './loopbackSession'
import { World } from '../World'
import { LockstepRunner } from './lockstep'

describe('LoopbackSession', () => {
  it('建立者為房主、含本地玩家一人', () => {
    const s = new LoopbackSession()
    expect(s.isHost()).toBe(true)
    expect(s.players().length).toBe(1)
  })
  it('玩家上限 4', () => {
    const s = new LoopbackSession()
    s.addFakePlayer(); s.addFakePlayer(); s.addFakePlayer() // 共 4
    expect(s.players().length).toBe(4)
    expect(s.addFakePlayer()).toBe('') // 第 5 被略過
    expect(s.players().length).toBe(4)
  })
  it('setCharacter/setReady 改本地玩家並觸發 onChange', () => {
    const s = new LoopbackSession()
    const cb = vi.fn(); s.onChange(cb)
    s.setCharacter('neutrophil'); s.setReady(true)
    expect(s.players()[0].character).toBe('neutrophil')
    expect(s.players()[0].ready).toBe(true)
    expect(cb).toHaveBeenCalled()
  })
  it('房主 setMap', () => {
    const s = new LoopbackSession()
    s.setMap('stomach')
    expect(s.getMap()).toBe('stomach')
  })
  it('canStart：房主 + ≥2 人 + 全員就緒', () => {
    const s = new LoopbackSession()
    expect(s.canStart()).toBe(false)      // 僅 1 人
    s.addFakePlayer()                      // fake 預設 ready
    expect(s.canStart()).toBe(false)      // 本地未 ready
    s.setReady(true)
    expect(s.canStart()).toBe(true)
  })
  it('start 在 canStart 才觸發 onStart', () => {
    const s = new LoopbackSession({ map: 'lung' })
    const onStart = vi.fn(); s.onStart(onStart)
    s.start(123)
    expect(onStart).not.toHaveBeenCalled() // 條件不足
    s.addFakePlayer(); s.setReady(true)
    s.start(123)
    expect(onStart).toHaveBeenCalledWith(123, 'lung', expect.any(Array))
  })
})

describe('LoopbackSession.toTransport（4B-2）', () => {
  it('只送本地輸入即可取得整幀（非本地自動補中性）', () => {
    const s = new LoopbackSession()
    s.addFakePlayer() // 2 玩家
    const t = s.toTransport(0)
    expect(t.playerCount).toBe(2)
    expect(t.inputsForTick(0)).toBeNull()          // 本地未送
    t.sendInput(0, { move: { x: 1, y: 0 } })
    const inputs = t.inputsForTick(0)
    expect(inputs).not.toBeNull()
    expect(inputs![0].move.x).toBe(1)              // 本地
    expect(inputs![1].move).toEqual({ x: 0, y: 0 }) // 非本地自動中性
  })

  it('runner + auto-neutral transport：單機多人持續推進', () => {
    const s = new LoopbackSession()
    s.addFakePlayer()
    const w = new World(1, ['macrophage', 'neutrophil'])
    const r = new LockstepRunner(w, s.toTransport(0))
    const x0 = w.players[0].entity.pos.x
    for (let f = 0; f < 60; f++) {
      r.submitLocalInput({ move: { x: 1, y: 0 } })
      while (r.tryAdvance()) { /* */ }
    }
    expect(r.getCurrentTick()).toBeGreaterThan(0) // 有推進、未停滯
    expect(w.players[0].entity.pos.x).toBeGreaterThan(x0) // 本地玩家右移
  })

  it('全員死亡 → world.hasLost 為 true', () => {
    const s = new LoopbackSession()
    s.addFakePlayer()
    const w = new World(1, ['macrophage', 'neutrophil'])
    const r = new LockstepRunner(w, s.toTransport(0))
    w.players[0].entity.hp = 0; w.players[1].entity.hp = 0
    r.submitLocalInput({ move: { x: 0, y: 0 } })
    while (r.tryAdvance()) { /* */ }
    expect(w.hasLost()).toBe(true)
  })
})
