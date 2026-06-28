import { describe, it, expect } from 'vitest'
import { PlayroomTransport, type InputMsg, type RpcChannel } from './playroomTransport'
import { sortPlayerIds } from './playerIndex'
import type { PlayerInput } from '../../engine/net/types'

/** 假 RpcChannel：記錄送出、可手動注入「收到」。 */
function fakeChannel() {
  let recv: ((msg: InputMsg, senderId: string) => void) | null = null
  const sent: InputMsg[] = []
  const ch: RpcChannel = {
    send: (msg) => sent.push(msg),
    onReceive: (cb) => { recv = cb },
  }
  return { ch, sent, deliver: (msg: InputMsg, from: string) => recv?.(msg, from) }
}

const mv = (x: number, y: number): PlayerInput => ({ move: { x, y } })

describe('PlayroomTransport', () => {
  it('未湊齊回 null；湊齊回依 index 排序的 TickInputs', () => {
    const ids = sortPlayerIds(['b', 'a']) // ['a','b']
    const f = fakeChannel()
    const t = new PlayroomTransport(ids, 'a', f.ch) // localIndex 0
    expect(t.playerCount).toBe(2)
    expect(t.localIndex).toBe(0)

    t.sendInput(5, mv(1, 0))
    expect(t.inputsForTick(5)).toBeNull() // 缺 b
    expect(f.sent).toEqual([{ tick: 5, input: mv(1, 0) }]) // 已廣播

    f.deliver({ tick: 5, input: mv(-1, 0) }, 'b')
    expect(t.inputsForTick(5)).toEqual([mv(1, 0), mv(-1, 0)]) // index 0=a,1=b
  })

  it('本地為非 0 index 時亦正確歸位', () => {
    const ids = sortPlayerIds(['a', 'b']) // ['a','b']
    const f = fakeChannel()
    const t = new PlayroomTransport(ids, 'b', f.ch) // localIndex 1
    expect(t.localIndex).toBe(1)
    t.sendInput(0, mv(0, 1))
    f.deliver({ tick: 0, input: mv(0, -1) }, 'a')
    expect(t.inputsForTick(0)).toEqual([mv(0, -1), mv(0, 1)])
  })

  it('亂序到達仍以 tick 正確歸位、互不干擾', () => {
    const ids = sortPlayerIds(['a', 'b'])
    const f = fakeChannel()
    const t = new PlayroomTransport(ids, 'a', f.ch)
    f.deliver({ tick: 2, input: mv(1, 1) }, 'b') // 對端 tick2 先到
    expect(t.inputsForTick(2)).toBeNull() // 本地 tick2 未送
    t.sendInput(1, mv(1, 0))
    f.deliver({ tick: 1, input: mv(0, 0) }, 'b')
    t.sendInput(2, mv(0, 1))
    expect(t.inputsForTick(1)).toEqual([mv(1, 0), mv(0, 0)])
    expect(t.inputsForTick(2)).toEqual([mv(0, 1), mv(1, 1)])
  })

  it('未知 senderId 不寫入（防越界）', () => {
    const ids = sortPlayerIds(['a', 'b'])
    const f = fakeChannel()
    const t = new PlayroomTransport(ids, 'a', f.ch)
    t.sendInput(0, mv(1, 0))
    f.deliver({ tick: 0, input: mv(9, 9) }, 'ghost') // 不在快照
    expect(t.inputsForTick(0)).toBeNull() // 仍缺 b
  })

  it('forgetTick 釋放已消化 tick 緩衝（避免長局累積）', () => {
    const ids = sortPlayerIds(['a', 'b'])
    const f = fakeChannel()
    const t = new PlayroomTransport(ids, 'a', f.ch)
    t.sendInput(3, mv(1, 0))
    f.deliver({ tick: 3, input: mv(-1, 0) }, 'b')
    expect(t.inputsForTick(3)).toEqual([mv(1, 0), mv(-1, 0)]) // 到齊
    t.forgetTick(3)
    expect(t.inputsForTick(3)).toBeNull() // 已釋放
  })
})
