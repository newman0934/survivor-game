/**
 * Lockstep 協調器：以固定 inputDelay 緩衝，每 tick 全員輸入到齊才依 index 套用並推進 World。
 * 升級選擇走 PlayerInput.pick（chooseUpgrade），確保各端確定性一致。不呼叫時間/亂數。
 */
import type { World } from '../World'
import type { NetTransport, PlayerInput } from './types'

/** 中性輸入（不移動、不選卡）；補在尚無資料的 tick 以維持各端推進一致。 */
const NEUTRAL: PlayerInput = { move: { x: 0, y: 0 } }

export class LockstepRunner {
  /** 下一個待執行的 tick（自 0 單調遞增）。 */
  private currentTick = 0
  /** 下一個本地輸入要送到的 tick（自 inputDelay 起）。 */
  private nextSubmitTick: number

  constructor(
    private world: World,
    private transport: NetTransport,
    inputDelay = 2,
  ) {
    // 預送 inputDelay 筆中性本地輸入（tick 0..inputDelay-1），使緩衝存在、模擬可起步。
    for (let t = 0; t < inputDelay; t++) this.transport.sendInput(t, NEUTRAL)
    this.nextSubmitTick = inputDelay
  }

  /** 送出本地玩家這一幀的輸入（指派到 currentSubmit tick，含 inputDelay 偏移）。 */
  submitLocalInput(input: PlayerInput): void {
    this.transport.sendInput(this.nextSubmitTick, input)
    this.nextSubmitTick += 1
  }

  /** 若下一個 tick 全員輸入到齊則套用並推進一格；否則停滯回 false。 */
  tryAdvance(): boolean {
    const inputs = this.transport.inputsForTick(this.currentTick)
    if (!inputs) return false
    for (let i = 0; i < inputs.length; i++) {
      this.world.setMoveInput(i, inputs[i].move)
      const pick = inputs[i].pick
      if (pick) this.world.chooseUpgrade(i, pick)
    }
    this.world.step(1 / 60)
    this.transport.forgetTick?.(this.currentTick) // 釋放已消化 tick 緩衝（長局/多場不累積）
    this.currentTick += 1
    return true
  }

  /** 目前已執行到的下一個 tick。 */
  getCurrentTick(): number {
    return this.currentTick
  }

  /** 目前 World 的確定性 checksum（供同步驗證/SP4 desync）。 */
  checksum(): number {
    return this.world.checksum()
  }
}
