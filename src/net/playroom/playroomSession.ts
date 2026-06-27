/**
 * Playroom（Free）真連線 NetSession。
 * 邊界：本檔屬 app 連線層（非純引擎），允許 Math.random/timers/network；僅 import type 引擎型別。
 * 註：playroomkit 外部 API 名稱依官方文件；安裝後若實際匯出不符，以其型別定義微調命名、行為不變。
 */
import {
  insertCoin,
  myPlayer,
  onPlayerJoin,
  isHost,
  getRoomCode,
  getState,
  setState,
  RPC,
} from 'playroomkit'
import type { PlayerState } from 'playroomkit'
import type { CharacterKind, MapKind } from '../../engine/types'
import { MAX_PLAYERS, type LobbyPlayer, type NetSession } from '../../engine/net/session'
import type { NetTransport } from '../../engine/net/types'
import { PlayroomTransport, type InputMsg, type RpcChannel } from './playroomTransport'
import { sortPlayerIds } from './playerIndex'

export class PlayroomSession implements NetSession {
  localId = ''
  roomCode = ''
  private players_ = new Map<string, PlayerState>()
  private changeCb: (() => void) | null = null
  private startCb: ((seed: number, map: MapKind, players: LobbyPlayer[]) => void) | null = null
  private peerLeftCb: (() => void) | null = null
  private inputRecv: ((msg: InputMsg, senderId: string) => void) | null = null
  private started = false
  private startedIds: string[] = []
  private poll: ReturnType<typeof setInterval> | null = null
  private readonly localCharacter: CharacterKind

  constructor(opts: { roomCode?: string; localCharacter?: CharacterKind } = {}) {
    this.localCharacter = opts.localCharacter ?? 'macrophage'
    void this.init(opts.roomCode)
  }

  private notify(): void { this.changeCb?.() }

  private async init(roomCode?: string): Promise<void> {
    await insertCoin({
      skipLobby: true,
      maxPlayersPerRoom: MAX_PLAYERS,
      ...(roomCode ? { roomCode } : {}),
    })

    const me = myPlayer()
    this.localId = me.id
    // getRoomCode() 實際回傳 string | undefined；缺省空字串。
    this.roomCode = getRoomCode() ?? ''
    me.setState('character', this.localCharacter)
    me.setState('ready', false)

    onPlayerJoin((p: PlayerState) => {
      this.players_.set(p.id, p)
      // onQuit 回呼簽章：(callback: (player: PlayerState) => void) => () => void
      p.onQuit((_quitter: PlayerState) => {
        this.players_.delete(p.id)
        if (this.started) this.peerLeftCb?.()
        else this.notify()
      })
      this.notify()
    })

    // RPC.register 回呼簽章：(payload, senderPlayer: PlayerState, mode) => Promise<any>
    // I-1：信任 payload.players（房主已排序的權威快照），不再各機自行掃 players_。
    RPC.register('start', async (data: { seed: number; map: MapKind; players: LobbyPlayer[] }) => {
      const players: LobbyPlayer[] = data.players
      this.startedIds = players.map((p) => p.id)
      this.started = true
      this.startCb?.(data.seed, data.map, players)
    })

    RPC.register('input', async (msg: InputMsg, sender: PlayerState) => {
      this.inputRecv?.(msg, sender.id)
    })

    // 連線層輪詢：彙整玩家 state 變動 → 通知 UI。
    this.poll = setInterval(() => this.notify(), 250)
    this.notify()
  }

  isHost(): boolean { return isHost() }

  players(): LobbyPlayer[] {
    const ids = sortPlayerIds([...this.players_.keys()])
    return ids.map((id) => {
      const p = this.players_.get(id)!
      return {
        id,
        character: (p.getState('character') as CharacterKind) ?? 'macrophage',
        ready: (p.getState('ready') as boolean) ?? false,
      }
    })
  }

  setCharacter(kind: CharacterKind): void { if (!this.localId) return; myPlayer().setState('character', kind); this.notify() }
  setReady(ready: boolean): void { if (!this.localId) return; myPlayer().setState('ready', ready); this.notify() }
  setMap(kind: MapKind): void { setState('map', kind); this.notify() }
  getMap(): MapKind { return (getState('map') as MapKind) ?? 'vessel' }

  onChange(cb: () => void): void { this.changeCb = cb }
  onStart(cb: (seed: number, map: MapKind, players: LobbyPlayer[]) => void): void { this.startCb = cb }
  onPeerLeft(cb: () => void): void { this.peerLeftCb = cb }

  canStart(): boolean {
    const ps = this.players()
    return isHost() && ps.length >= 2 && ps.every((p) => p.ready)
  }

  start(seed: number): void {
    if (this.canStart()) void RPC.call('start', { seed, map: this.getMap(), players: this.players() }, RPC.Mode.ALL)
  }

  toTransport(_localIndex: number): NetTransport {
    const channel: RpcChannel = {
      send: (msg) => { void RPC.call('input', msg, RPC.Mode.ALL) },
      onReceive: (cb) => { this.inputRecv = cb },
    }
    return new PlayroomTransport(this.startedIds, this.localId, channel)
  }

  leave(): void {
    if (this.poll) { clearInterval(this.poll); this.poll = null }
    this.changeCb = null
    this.startCb = null
    this.peerLeftCb = null
    this.inputRecv = null
    // M-4：重置開局狀態，避免重用同實例時殘留舊快照。
    this.started = false
    this.startedIds = []
    this.players_.clear()
    if (this.localId) myPlayer().leaveRoom()
  }
}
