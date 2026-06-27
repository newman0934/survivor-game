# Playroom（Free）adapter Implementation Plan（多人合作 4C）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 以 Playroom Kit（Free）實作既有 `NetSession`/`NetTransport`，把單機驗證過的多人 lockstep 地基接上真實跨機連線。

**Architecture:** adapter 置 app 層 `src/net/playroom/`，僅 `import type` 引擎型別；純引擎與 `engine/net/`（介面 + Loopback）不動。可測邏輯（id 排序索引、transport 緩衝/到齊/亂序）抽成不依賴 `playroomkit` 的純單元；Playroom 綁定（`insertCoin`/`RPC`/state/quit）為薄膠水層，靠 typecheck/build + 兩機實測驗證。

**Tech Stack:** TypeScript、Vue 3、Vite、Vitest、PixiJS、Pinia、playroomkit。

## Global Constraints

- 預設語言繁體中文（zh-TW）；程式碼/型別/API/commit 格式除外。
- 純引擎 `src/engine/**` 執行期不得 import Vue/Pinia/playroomkit；adapter 僅 `import type` 引擎型別。
- 模擬路徑零 `Math.random`/`Date.now`/`performance.now`；adapter（連線/選單層）允許 `Math.random`/timers/network。
- `determinism.test.ts` source-guard 僅掃 `src/engine/`，不含 `src/net/playroom/`（毋須改測試）。
- 確定性 lockstep：所有機器對玩家 index 必須一致 → `players()` 與 transport 皆以 **id 字典序排序** 取得共識順序。
- 單人零退化：單人 `startGame`/`Game.start` 路徑不動；既有 312 測試零改動全綠；typecheck/build 乾淨。
- 實作既有介面，不新增引擎模擬型別；唯一允許的 `engine/net/session.ts` 變更為新增選用斷線回呼 `onPeerLeft`（純 callback 型別，Loopback no-op）。
- commit 格式：`[mvp][type][scope] 描述`，結尾 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。
- Playroom 外部 API 名稱依官方文件撰寫；安裝後若實際型別不符，**以安裝的 `playroomkit` 型別定義為準微調命名**，但須維持本計畫規定之行為與本專案介面簽章。

---

### Task 1: 安裝 playroomkit + 玩家 index 共識純函式

**Files:**
- Modify: `package.json`（新增相依 `playroomkit`）
- Create: `src/net/playroom/playerIndex.ts`
- Test: `src/net/playroom/playerIndex.test.ts`

**Interfaces:**
- Produces:
  - `export function sortPlayerIds(ids: string[]): string[]` — 回傳 id 字典序排序的新陣列（不改入參）。
  - `export function indexOfPlayer(sortedIds: string[], id: string): number` — 回傳 id 在排序陣列的位置，無則 `-1`。

- [ ] **Step 1: 安裝相依**

Run: `npm install playroomkit`
Expected: `package.json` 出現 `"playroomkit"`；`npm run typecheck` 仍乾淨。

- [ ] **Step 2: 寫失敗測試**

Create `src/net/playroom/playerIndex.test.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { sortPlayerIds, indexOfPlayer } from './playerIndex'

describe('playerIndex — 跨機 index 共識', () => {
  it('sortPlayerIds 以字典序排序且不改入參', () => {
    const ids = ['c', 'a', 'b']
    expect(sortPlayerIds(ids)).toEqual(['a', 'b', 'c'])
    expect(ids).toEqual(['c', 'a', 'b']) // 入參不變
  })

  it('不同加入順序 → 相同排序結果（各機一致）', () => {
    expect(sortPlayerIds(['p2', 'p1', 'p3'])).toEqual(sortPlayerIds(['p3', 'p2', 'p1']))
  })

  it('indexOfPlayer 回傳排序位置；不存在回 -1', () => {
    const s = sortPlayerIds(['x', 'a', 'm'])
    expect(indexOfPlayer(s, 'a')).toBe(0)
    expect(indexOfPlayer(s, 'm')).toBe(1)
    expect(indexOfPlayer(s, 'x')).toBe(2)
    expect(indexOfPlayer(s, 'zzz')).toBe(-1)
  })
})
```

- [ ] **Step 3: 確認失敗**

Run: `npm test -- playerIndex`
Expected: FAIL（`playerIndex` 模組不存在）。

- [ ] **Step 4: 實作**

Create `src/net/playroom/playerIndex.ts`：

```ts
/** 玩家 index 跨機共識：所有端對相同 id 集合以字典序得到相同順序。 */

/** 回傳 id 字典序排序的新陣列（不改入參）。 */
export function sortPlayerIds(ids: string[]): string[] {
  return [...ids].sort()
}

/** 回傳 id 在排序陣列的位置；不存在回 -1。 */
export function indexOfPlayer(sortedIds: string[], id: string): number {
  return sortedIds.indexOf(id)
}
```

- [ ] **Step 5: 確認通過 + typecheck**

Run: `npm test -- playerIndex` → PASS；`npm run typecheck` → 乾淨。

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/net/playroom/playerIndex.ts src/net/playroom/playerIndex.test.ts
git commit -m "[mvp][feat][net] 安裝 playroomkit + 玩家 index 共識純函式

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: PlayroomTransport（可注入 RpcChannel，純單元測試）

**Files:**
- Create: `src/net/playroom/playroomTransport.ts`
- Test: `src/net/playroom/playroomTransport.test.ts`

**Interfaces:**
- Consumes: `sortPlayerIds`/`indexOfPlayer`（Task 1）；引擎型別 `NetTransport`、`PlayerInput`、`TickInputs`（`import type` 自 `../../engine/net/types`）。
- Produces:
  - `export interface InputMsg { tick: number; input: PlayerInput }`
  - `export interface RpcChannel { send(msg: InputMsg): void; onReceive(cb: (msg: InputMsg, senderId: string) => void): void }`
  - `export class PlayroomTransport implements NetTransport`，建構子 `constructor(sortedIds: string[], localId: string, channel: RpcChannel)`；欄位 `playerCount`、`localIndex`；方法 `sendInput`、`inputsForTick`。

**設計重點：** transport 不直接 import `playroomkit`；真 RPC 由 Task 3 包成 `RpcChannel` 注入。緩衝以 `tick` 為 key、長度 `playerCount` 的列，依 senderId→index 歸位；本地 `sendInput` 同時寫自身格與經 channel 廣播；`inputsForTick` 湊齊全格才回。

- [ ] **Step 1: 寫失敗測試**

Create `src/net/playroom/playroomTransport.test.ts`：

```ts
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
})
```

- [ ] **Step 2: 確認失敗**

Run: `npm test -- playroomTransport`
Expected: FAIL（模組不存在）。

- [ ] **Step 3: 實作**

Create `src/net/playroom/playroomTransport.ts`：

```ts
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
}
```

- [ ] **Step 4: 確認通過 + typecheck**

Run: `npm test -- playroomTransport` → PASS（4 測試）；`npm run typecheck` → 乾淨。

- [ ] **Step 5: Commit**

```bash
git add src/net/playroom/playroomTransport.ts src/net/playroom/playroomTransport.test.ts
git commit -m "[mvp][feat][net] PlayroomTransport：可注入 RpcChannel + tick 緩衝到齊推進

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: PlayroomSession（Playroom 綁定，實作 NetSession + onPeerLeft）

**Files:**
- Modify: `src/engine/net/session.ts`（新增選用回呼 `onPeerLeft(cb: () => void): void`）
- Modify: `src/engine/net/loopbackSession.ts`（`onPeerLeft` no-op）
- Create: `src/net/playroom/playroomSession.ts`
- Test: 無新單元測試（Playroom 綁定屬整合膠水層，依本專案慣例以 typecheck/build + 兩機實測驗證）

**Interfaces:**
- Consumes: `NetSession`/`LobbyPlayer`/`MAX_PLAYERS`（`./session`）、`NetTransport`（`./types`）、`CharacterKind`/`MapKind`（`../../engine/types`）、`PlayroomTransport`/`RpcChannel`/`InputMsg`（`./playroomTransport`）、`sortPlayerIds`（`./playerIndex`）、`playroomkit`。
- Produces:
  - `engine/net/session.ts` 之 `NetSession` 介面新增：`onPeerLeft(cb: () => void): void`（遊戲中任一玩家離線時呼叫一次）。
  - `export class PlayroomSession implements NetSession`，建構子 `constructor(opts?: { roomCode?: string; localCharacter?: CharacterKind })`，內部啟動 `insertCoin({ skipLobby: true })`。

**行為（依官方文件；安裝後依實際型別微調命名，行為不變）：**
- 建構即 `void this.init(opts)`：`await insertCoin({ skipLobby: true, maxPlayersPerRoom: MAX_PLAYERS })`（若帶 `opts.roomCode` 一併傳入以加入指定房）；連線後設 `localId = myPlayer().id`、`roomCode = getRoomCode()`、寫入本地角色 state、`notify()`。
- `onPlayerJoin((p) => …)`：把 `p` 納入內部映射、訂閱 `p.onQuit(...)`、`notify()`。
- 玩家狀態（character/ready）以 `player.getState(key)` 讀、`myPlayer().setState(key, v)` 寫；以 `setInterval`（連線層允許）每 250ms 輪詢彙整 → 變動才 `notify()`（文件若提供原生訂閱可改用）。
- `players()`：把目前所有玩家以 `sortPlayerIds` 排序後映射為 `LobbyPlayer[]`（character 取 state、缺省 `'macrophage'`，ready 取 state、缺省 `false`）→ **各機順序一致**。
- `setMap`：房主寫 room-level `setState('map', kind)`；`getMap` 讀 `getState('map')`、缺省 `'vessel'`。
- `start(seed)`：僅 `canStart()` 時，`RPC.call('start', { seed, map }, RPC.Mode.ALL)` 廣播。
- `RPC.register('start', ({ seed, map }) => …)`：凍結當下 `players()`（已排序）為開局快照、設 `started`、觸發 `onStart(seed, map, snapshot)`。
- `RPC.register('input', (msg, caller) => …)`：轉交給目前 transport 的 `RpcChannel.onReceive`（caller 的 id 作 senderId）。
- `toTransport(localIndex)`：以開局排序快照 ids 建 `RpcChannel`（`send` → `RPC.call('input', msg, RPC.Mode.ALL)`；`onReceive` 接 `'input'` RPC）→ `new PlayroomTransport(sortedIds, this.localId, channel)`。
- 斷線：任一 `p.onQuit`，若已 `started` 則呼叫 `peerLeftCb`（一次）；大廳階段則移除該玩家、`notify()`。
- `onPeerLeft(cb)`、`onChange(cb)`、`onStart(cb)`：存回呼。
- `leave()`：清 `setInterval`、清回呼、`quitGame?.()`（若文件提供）。

- [ ] **Step 1: 介面新增 onPeerLeft**

Modify `src/engine/net/session.ts`：在 `leave(): void` 上方新增：

```ts
  /** 遊戲中任一玩家離線時呼叫（MVP：本局結束）；Loopback 無實作。 */
  onPeerLeft(cb: () => void): void
```

- [ ] **Step 2: Loopback no-op**

Modify `src/engine/net/loopbackSession.ts`：在 `leave()` 方法旁新增：

```ts
  onPeerLeft(_cb: () => void): void { /* 單機 Loopback 無遠端離線 */ }
```

Run: `npm run typecheck` → 乾淨（確認介面相容、既有引用未壞）。

- [ ] **Step 3: 實作 PlayroomSession**

Create `src/net/playroom/playroomSession.ts`：

```ts
/**
 * Playroom（Free）真連線 NetSession。
 * 邊界：本檔屬 app 連線層（非純引擎），允許 Math.random/timers/network；僅 import type 引擎型別。
 * 註：playroomkit 外部 API 名稱依官方文件；安裝後若實際匯出不符，以其型別定義微調命名、行為不變。
 */
import { insertCoin, myPlayer, onPlayerJoin, isHost, getRoomCode, getState, setState, RPC } from 'playroomkit'
import type { CharacterKind, MapKind } from '../../engine/types'
import { MAX_PLAYERS, type LobbyPlayer, type NetSession } from '../../engine/net/session'
import type { NetTransport } from '../../engine/net/types'
import { PlayroomTransport, type InputMsg, type RpcChannel } from './playroomTransport'
import { sortPlayerIds } from './playerIndex'

/** Playroom 玩家最小形狀（避免硬綁其完整型別）。 */
interface PRPlayer {
  id: string
  getState(key: string): unknown
  setState(key: string, value: unknown): void
  onQuit(cb: () => void): void
}

export class PlayroomSession implements NetSession {
  localId = ''
  roomCode = ''
  private players_ = new Map<string, PRPlayer>()
  private changeCb: (() => void) | null = null
  private startCb: ((seed: number, map: MapKind, players: LobbyPlayer[]) => void) | null = null
  private peerLeftCb: (() => void) | null = null
  private inputRecv: ((msg: InputMsg, senderId: string) => void) | null = null
  private started = false
  private poll: ReturnType<typeof setInterval> | null = null
  private readonly localCharacter: CharacterKind

  constructor(opts: { roomCode?: string; localCharacter?: CharacterKind } = {}) {
    this.localCharacter = opts.localCharacter ?? 'macrophage'
    void this.init(opts.roomCode)
  }

  private notify(): void { this.changeCb?.() }

  private async init(roomCode?: string): Promise<void> {
    await insertCoin({ skipLobby: true, maxPlayersPerRoom: MAX_PLAYERS, ...(roomCode ? { roomCode } : {}) } as Parameters<typeof insertCoin>[0])
    const me = myPlayer() as unknown as PRPlayer
    this.localId = me.id
    this.roomCode = getRoomCode()
    me.setState('character', this.localCharacter)
    me.setState('ready', false)

    onPlayerJoin((p) => {
      const pl = p as unknown as PRPlayer
      this.players_.set(pl.id, pl)
      pl.onQuit(() => {
        this.players_.delete(pl.id)
        if (this.started) this.peerLeftCb?.()
        else this.notify()
      })
      this.notify()
    })

    RPC.register('start', (data: { seed: number; map: MapKind }) => {
      this.started = true
      this.startCb?.(data.seed, data.map, this.players())
      return Promise.resolve()
    })
    RPC.register('input', (msg: InputMsg, caller: { id: string }) => {
      this.inputRecv?.(msg, caller.id)
      return Promise.resolve()
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

  setCharacter(kind: CharacterKind): void { (myPlayer() as unknown as PRPlayer).setState('character', kind); this.notify() }
  setReady(ready: boolean): void { (myPlayer() as unknown as PRPlayer).setState('ready', ready); this.notify() }
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
    if (this.canStart()) void RPC.call('start', { seed, map: this.getMap() }, RPC.Mode.ALL)
  }

  toTransport(_localIndex: number): NetTransport {
    const sortedIds = sortPlayerIds([...this.players_.keys()])
    const channel: RpcChannel = {
      send: (msg) => { void RPC.call('input', msg, RPC.Mode.ALL) },
      onReceive: (cb) => { this.inputRecv = cb },
    }
    return new PlayroomTransport(sortedIds, this.localId, channel)
  }

  leave(): void {
    if (this.poll) { clearInterval(this.poll); this.poll = null }
    this.changeCb = null
    this.startCb = null
    this.peerLeftCb = null
    this.inputRecv = null
  }
}
```

- [ ] **Step 4: typecheck + build（對 playroomkit 真型別）**

Run: `npm run typecheck` → 乾淨；`npm run build` → 乾淨。
若 `playroomkit` 實際匯出名稱/簽章不符（如 `RPC.Mode`、`insertCoin` 選項、`onPlayerJoin` 回呼參數），**依其安裝的型別定義微調命名與斷言**，維持上述行為與本專案介面簽章。

- [ ] **Step 5: 既有測試零退化**

Run: `npm test` → 既有 312 + 新增 transport/index 測試全綠（既有測試零改動）。

- [ ] **Step 6: Commit**

```bash
git add src/engine/net/session.ts src/engine/net/loopbackSession.ts src/net/playroom/playroomSession.ts
git commit -m "[mvp][feat][net] PlayroomSession：真房間/碼/角色就緒/種子廣播/斷線結束 + onPeerLeft

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: App 接線（多人→PlayroomSession）+ 離線提示 + 兩機測試指南

**Files:**
- Modify: `src/App.vue`（`createOrJoin` 改用 `PlayroomSession`、訂閱 `onPeerLeft`）
- Modify: `src/stores/game.ts`（新增 `notice: string | null` + `setNotice`/`clearNotice`，`toMenu` 清空）
- Modify: `src/ui/MainMenu.vue`（顯示 `store.notice` 橫幅，可關閉）
- Create: `docs/superpowers/specs/coop-playroom-adapter/manual-test-guide.md`
- Modify: `progress.md`、`docs/superpowers/specs/coop-playroom-adapter/acceptance.md`

**Interfaces:**
- Consumes: `PlayroomSession`（Task 3）、`NetSession.onPeerLeft`（Task 3）。
- Produces: store `notice` 狀態 + `setNotice(msg: string)`/`clearNotice()`。

- [ ] **Step 1: store 新增 notice**

Modify `src/stores/game.ts`：在 state 加 `notice: null as string | null`；actions 加：

```ts
    setNotice(msg: string) { this.notice = msg },
    clearNotice() { this.notice = null },
```

並在 `toMenu()` 內（重置區）加入 `this.notice = null`（離開時清；但 onPeerLeft 設定的提示需在進選單後仍可見 → 見 Step 3 順序）。

- [ ] **Step 2: MainMenu 顯示提示橫幅**

Modify `src/ui/MainMenu.vue`：template 最上方加（沿用既有膜質樣式類名即可，無則用簡單 class）：

```vue
  <div v-if="store.notice" class="notice-banner" @click="store.clearNotice()">
    {{ store.notice }}（點擊關閉）
  </div>
```

確保 `MainMenu.vue` 已可存取 `store`（`useGameStore()`）；若無則 `import { useGameStore } from '../stores/game'` 並 `const store = useGameStore()`。

- [ ] **Step 3: App 改用 PlayroomSession + onPeerLeft**

Modify `src/App.vue`：
- import：`import { PlayroomSession } from './net/playroom/playroomSession'`（移除或保留 LoopbackSession import；保留供必要時切換，但 `createOrJoin` 改用 Playroom）。
- `createOrJoin` 改：

```ts
function createOrJoin(code?: string) {
  session = new PlayroomSession({ roomCode: code || undefined, localCharacter: 'macrophage' })
  session.onChange(pushLobby)
  session.onPeerLeft(() => {
    game?.stop(); game = null
    store.setNotice('有玩家離線，本局結束')
    store.toMenu()
  })
  session.onStart(async (seed, map, players) => {
    if (!session || !canvasParent.value) return
    const localIndex = players.findIndex((p) => p.id === session!.localId)
    store.setCharacter(players[localIndex]?.character ?? 'macrophage')
    store.start()
    game = await Game.startMultiplayer(
      canvasParent.value, seed, players.map((p) => p.character), map,
      session.toTransport(localIndex), localIndex, bloomEnabled.value,
    )
  })
}
```

（注意：`store.toMenu()` 會清 notice → 因此 `setNotice` 必須在 `toMenu()` **之後**呼叫。調整順序為先 `toMenu()` 再 `setNotice`。）

修正 onPeerLeft 內順序為：

```ts
  session.onPeerLeft(() => {
    game?.stop(); game = null
    store.toMenu()
    store.setNotice('有玩家離線，本局結束')
  })
```

- [ ] **Step 4: typecheck + build + 全測試**

Run: `npm run typecheck` → 乾淨；`npm run build` → 乾淨；`npm test` → 全綠。

- [ ] **Step 5: 兩機手動測試指南**

Create `docs/superpowers/specs/coop-playroom-adapter/manual-test-guide.md`：

```markdown
# 兩機手動測試指南 — Playroom 真連線（4C）

> 此功能的跨機同步無法由單元測試/單機驗證，需兩台機器 + 一位朋友實測。

## 前置
- Playroom Free 免 API key、免信用卡、非商業、上限 10 DAU——足夠 2–4 私房好友。
- 部署：`npm run build` → 將 `dist/` 發佈到 GitHub Pages（HTTPS）；或本機 `npm run dev` 兩台同網段測試。

## 步驟
1. 機器 A 開站 → 主選單「多人遊玩」→「建立房間」。
2. 等待室出現房間碼/連結；把碼或 `?r=CODE` 連結給機器 B。
3. 機器 B 開站 → 「多人遊玩」→「加入」輸入碼（或直接開分享連結）。
4. 兩端等待室玩家列表應一致（同樣排序、角色、就緒）。
5. 各自選角、按就緒；房主（A）選地圖。
6. 全員就緒後房主按「開始」。
7. 兩端應同時開局、地圖/角色一致。
8. 移動、開火、撿寶石、升級三選一——彼此動作應在對方畫面可見、無明顯 desync。
9. 升級：本地選卡後，對方畫面該玩家亦套用對應升級。
10. 其中一台關閉分頁 → 另一台應收到「有玩家離線，本局結束」並回主選單。

## 已知限制（MVP）
- 任一玩家離線即結束本局（無續跑、無房主遷移）。
- 跨瀏覽器超越函式（sin/cos 等）理論上可能極微差異；如遇罕見 desync，先確認雙方為相同瀏覽器版本。

## 若 API 不符
- 安裝後若 `playroomkit` 匯出名稱/簽章與 `playroomSession.ts` 不同，依其型別定義微調（roomCode 注入、RPC.Mode、onPlayerJoin 回呼參數），行為維持本指南所述。
```

- [ ] **Step 6: 更新 progress + acceptance**

Modify `progress.md`：將 4C 列改為已完成（我方可驗部分），標注「真跨機同步待使用者兩機實測」；多人合作整體標記地基完成。
Modify `acceptance.md`：勾選「我方可驗」全部項目；「使用者兩機實測」維持待測。

- [ ] **Step 7: Commit**

```bash
git add src/App.vue src/stores/game.ts src/ui/MainMenu.vue docs/superpowers/specs/coop-playroom-adapter/manual-test-guide.md progress.md docs/superpowers/specs/coop-playroom-adapter/acceptance.md
git commit -m "[mvp][feat][net] App 多人接 PlayroomSession + 離線提示 + 兩機測試指南

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage：**
- FR1 架構邊界 → Task 1–3（`src/net/playroom/` 僅 import type；source-guard 不含）✅
- FR2 PlayroomSession → Task 3 ✅
- FR3 playerIndex 一致 → Task 1（helper）+ Task 2/3（採用排序快照）✅
- FR4 種子廣播 → Task 3（`start` RPC）✅
- FR5 PlayroomTransport → Task 2 ✅
- FR6 斷線結束 → Task 3（onQuit→peerLeftCb）+ Task 4（App→toMenu+notice）✅
- FR7 接線 → Task 4 ✅
- 單元測試（index、transport buffer/亂序）→ Task 1/2 ✅
- 兩機測試指南 → Task 4 ✅

**2. Placeholder scan：** 無 TBD/TODO；每步含實際程式碼或具體指令。Task 3/4 的 Playroom 綁定與 UI 屬整合膠水層，依本專案慣例不寫單元測試，改以 typecheck/build + 既有測試全綠 + 兩機實測驗證（已於 spec/acceptance 明示）。

**3. Type consistency：** `sortPlayerIds`/`indexOfPlayer`（Task1）→ Task2/3 一致使用；`PlayroomTransport(sortedIds, localId, channel)`、`RpcChannel{send,onReceive}`、`InputMsg{tick,input}` 跨 Task2/3 一致；`NetSession.onPeerLeft` 於 Task3 定義、Task3 Loopback 實作、Task4 App 使用；store `notice`/`setNotice`/`clearNotice` Task4 內一致。

**已知風險（已在計畫內標注）：** `playroomkit` 實際 API 與文件可能有出入；計畫於 Task3/4 明確要求「以安裝型別為準微調命名、行為不變」，並由兩機實測收尾。
