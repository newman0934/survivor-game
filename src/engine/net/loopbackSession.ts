/** 行程內單機 NetSession（測試/開發；真 Playroom 屬 4C）。 */
import type { CharacterKind, MapKind } from '../types'
import { MAX_PLAYERS, type LobbyPlayer, type NetSession } from './session'

export class LoopbackSession implements NetSession {
  readonly localId: string
  readonly roomCode: string
  private map: MapKind
  private list: LobbyPlayer[]
  private changeCb: (() => void) | null = null
  private startCb: ((seed: number, map: MapKind, players: LobbyPlayer[]) => void) | null = null
  private fakeSeq = 0

  constructor(opts: { roomCode?: string; localId?: string; localCharacter?: CharacterKind; map?: MapKind } = {}) {
    this.localId = opts.localId ?? 'local'
    this.roomCode = opts.roomCode ?? 'LOCAL'
    this.map = opts.map ?? 'vessel'
    this.list = [{ id: this.localId, character: opts.localCharacter ?? 'macrophage', ready: false }]
  }

  isHost(): boolean { return true }
  players(): LobbyPlayer[] { return this.list }
  getMap(): MapKind { return this.map }
  private notify(): void { this.changeCb?.() }

  setCharacter(kind: CharacterKind): void {
    const p = this.list.find((x) => x.id === this.localId)
    if (p) { p.character = kind; this.notify() }
  }
  setReady(ready: boolean): void {
    const p = this.list.find((x) => x.id === this.localId)
    if (p) { p.ready = ready; this.notify() }
  }
  setMap(kind: MapKind): void { this.map = kind; this.notify() }
  onChange(cb: () => void): void { this.changeCb = cb }
  canStart(): boolean { return this.list.length >= 2 && this.list.every((p) => p.ready) }
  start(seed: number): void { if (this.canStart()) this.startCb?.(seed, this.map, this.list.slice()) }
  onStart(cb: (seed: number, map: MapKind, players: LobbyPlayer[]) => void): void { this.startCb = cb }
  leave(): void { this.changeCb = null; this.startCb = null }

  /** 測試/UI 模擬他人加入；回新玩家 id（滿員回空字串）。 */
  addFakePlayer(character: CharacterKind = 'neutrophil'): string {
    if (this.list.length >= MAX_PLAYERS) return ''
    const id = `fake${++this.fakeSeq}`
    this.list.push({ id, character, ready: true })
    this.notify()
    return id
  }
  removeFakePlayer(id: string): void {
    this.list = this.list.filter((p) => p.id !== id)
    this.notify()
  }
}
