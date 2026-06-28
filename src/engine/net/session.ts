/** 等待室階段的連線會話抽象（與遊戲中的 NetTransport 分離）。 */
import type { CharacterKind, MapKind } from '../types'
import type { NetTransport } from './types'

/** 玩家上限。 */
export const MAX_PLAYERS = 4

/** 等待室中的一名玩家。 */
export interface LobbyPlayer {
  id: string
  character: CharacterKind
  ready: boolean
}

export interface NetSession {
  /** 本地玩家在房內的唯一 id。 */
  readonly localId: string
  /** 房間碼（供分享/加入）。 */
  readonly roomCode: string
  /** 本地玩家是否為房主。 */
  isHost(): boolean
  /** 依加入順序（＝遊戲玩家 index）。 */
  players(): LobbyPlayer[]
  /** 設定本地玩家的角色（寫入該玩家狀態並通知）。 */
  setCharacter(kind: CharacterKind): void
  /** 設定本地玩家的就緒狀態。 */
  setReady(ready: boolean): void
  /** 設定地圖（僅房主有效）。 */
  setMap(kind: MapKind): void
  /** 取得目前選定地圖。 */
  getMap(): MapKind
  /** 等待室狀態變更（玩家/角色/就緒/地圖）時通知。 */
  onChange(cb: () => void): void
  /** 房主 && ≥2 人 && 全員就緒。 */
  canStart(): boolean
  /** 僅房主：canStart 才觸發 onStart。 */
  start(seed: number): void
  /** 註冊開局回呼（各端收到開始訊號時以同一 seed/map/玩家快照觸發）。 */
  onStart(cb: (seed: number, map: MapKind, players: LobbyPlayer[]) => void): void
  /** 進遊戲時產生逐幀輸入傳輸（lockstep 用）。 */
  toTransport(localIndex: number): NetTransport
  /** 遊戲中任一玩家離線時呼叫（MVP：本局結束）；Loopback 無實作。 */
  onPeerLeft(cb: () => void): void
  /** 離開房間並清理回呼/連線資源。 */
  leave(): void
}
