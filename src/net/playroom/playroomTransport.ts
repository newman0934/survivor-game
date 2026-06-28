/** Playroom 局內輸入傳輸：實作引擎 NetTransport（RPC 由外部注入為 RpcChannel）。 */
import type { NetTransport, PlayerInput, TickInputs } from '../../engine/net/types'
import { indexOfPlayer } from './playerIndex'

/** 單筆輸入訊息（經 RPC 廣播）。 */
export interface InputMsg {
  tick: number
  input: PlayerInput
}

/** RPC 通道抽象：送出本地輸入、訂閱收到（含發送者 id）。真 Playroom 綁定由 PlayroomSession 注入。 */
export interface RpcChannel {
  send(msg: InputMsg): void
  onReceive(cb: (msg: InputMsg, senderId: string) => void): void
}

export class PlayroomTransport implements NetTransport {
  readonly playerCount: number
  readonly localIndex: number
  private readonly sortedIds: string[]
  private readonly channel: RpcChannel
  /** tick → 長度 playerCount 的輸入列（未到者 undefined）。 */
  private readonly buffer = new Map<number, (PlayerInput | undefined)[]>()

  constructor(sortedIds: string[], localId: string, channel: RpcChannel) {
    this.sortedIds = sortedIds
    this.playerCount = sortedIds.length
    this.localIndex = indexOfPlayer(sortedIds, localId)
    this.channel = channel
    this.channel.onReceive((msg, senderId) => {
      const idx = indexOfPlayer(this.sortedIds, senderId)
      if (idx >= 0) this.put(msg.tick, idx, msg.input)
    })
  }

  private put(tick: number, idx: number, input: PlayerInput): void {
    let row = this.buffer.get(tick)
    if (!row) {
      row = new Array<PlayerInput | undefined>(this.playerCount).fill(undefined)
      this.buffer.set(tick, row)
    }
    row[idx] = input
  }

  sendInput(tick: number, input: PlayerInput): void {
    this.put(tick, this.localIndex, input)
    this.channel.send({ tick, input })
  }

  inputsForTick(tick: number): TickInputs | null {
    const row = this.buffer.get(tick)
    if (!row) return null
    for (let i = 0; i < this.playerCount; i++) if (!row[i]) return null
    return row as TickInputs
  }

  /** 釋放已消化 tick 的緩衝列（lockstep 推進後呼叫）。 */
  forgetTick(tick: number): void {
    this.buffer.delete(tick)
  }
}
