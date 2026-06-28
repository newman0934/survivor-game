/**
 * Lockstep 多人同步的傳輸抽象與輸入型別。
 * 同步模型：只傳「每玩家每 tick 的輸入」，各端各自跑確定性模擬得到相同結果。
 */

/** 單一玩家某 tick 的輸入。 */
export interface PlayerInput {
  /** 移動方向（鍵盤離散 -1|0|1）。 */
  move: { x: number; y: number }
  /** 該 tick 選定的升級卡 id（無則省略/null）；升級走輸入流以維持各端一致。 */
  pick?: string | null
}

/** 某 tick 全員輸入（長度＝playerCount，依玩家 index）。 */
export type TickInputs = PlayerInput[]

/** 傳輸抽象：送出本地輸入、取某 tick 全員輸入。 */
export interface NetTransport {
  readonly playerCount: number
  readonly localIndex: number
  /** 送出本地玩家某 tick 的輸入。 */
  sendInput(tick: number, input: PlayerInput): void
  /** 取某 tick 全員輸入；尚未到齊回 null。 */
  inputsForTick(tick: number): TickInputs | null
  /** 釋放已消化 tick 的緩衝（lockstep 推進後呼叫，避免長局累積）；選用。 */
  forgetTick?(tick: number): void
}
