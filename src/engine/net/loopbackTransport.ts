/**
 * 行程內 loopback 傳輸：一條共享 bus 連接 N 個本地 endpoint，供測試與同機模擬 N 玩家。
 */
import type { NetTransport, PlayerInput, TickInputs } from './types'

/** 共享輸入儲存，依 (tick, playerIndex) 存放，到齊才回該 tick 全員輸入。 */
export class LoopbackBus {
  private store = new Map<number, (PlayerInput | undefined)[]>()

  submit(tick: number, playerIndex: number, input: PlayerInput): void {
    let row = this.store.get(tick)
    if (!row) { row = []; this.store.set(tick, row) }
    row[playerIndex] = input
  }

  get(tick: number, playerCount: number): TickInputs | null {
    const row = this.store.get(tick)
    if (!row) return null
    for (let i = 0; i < playerCount; i++) if (row[i] === undefined) return null
    return row.slice(0, playerCount) as TickInputs
  }
}

/** 連到共享 bus 的一個本地 endpoint。 */
export class LoopbackTransport implements NetTransport {
  constructor(
    private bus: LoopbackBus,
    readonly playerCount: number,
    readonly localIndex: number,
  ) {}

  sendInput(tick: number, input: PlayerInput): void {
    this.bus.submit(tick, this.localIndex, input)
  }

  inputsForTick(tick: number): TickInputs | null {
    return this.bus.get(tick, this.playerCount)
  }
}
