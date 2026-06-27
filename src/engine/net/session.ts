/** 等待室階段的連線會話抽象（與遊戲中的 NetTransport 分離）。 */
import type { CharacterKind, MapKind } from '../types'

/** 玩家上限。 */
export const MAX_PLAYERS = 4

/** 等待室中的一名玩家。 */
export interface LobbyPlayer {
  id: string
  character: CharacterKind
  ready: boolean
}

export interface NetSession {
  readonly localId: string
  readonly roomCode: string
  isHost(): boolean
  /** 依加入順序（＝遊戲玩家 index）。 */
  players(): LobbyPlayer[]
  setCharacter(kind: CharacterKind): void
  setReady(ready: boolean): void
  /** 設定地圖（僅房主有效）。 */
  setMap(kind: MapKind): void
  getMap(): MapKind
  /** 等待室狀態變更（玩家/角色/就緒/地圖）時通知。 */
  onChange(cb: () => void): void
  /** 房主 && ≥2 人 && 全員就緒。 */
  canStart(): boolean
  /** 僅房主：canStart 才觸發 onStart。 */
  start(seed: number): void
  onStart(cb: (seed: number, map: MapKind, players: LobbyPlayer[]) => void): void
  leave(): void
}
