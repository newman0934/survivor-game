import { describe, it, expect, vi } from 'vitest'
import { LoopbackSession } from './loopbackSession'

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
