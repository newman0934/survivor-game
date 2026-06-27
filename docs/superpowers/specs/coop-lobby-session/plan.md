# coop-lobby-session (4B-1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 `NetSession` 抽象 + `LoopbackSession`，並做主選單單人/多人分層 + 建立/加入/等待室 UI（到房主按開始觸發 onStart 為止）；單人零退化。

**Architecture:** `engine/net/session.ts` 定義 `NetSession`/`LobbyPlayer`/`MAX_PLAYERS`；`loopbackSession.ts` 行程內單機實作（可測 + 提供 addFakePlayer 模擬）；store 加 lobby 狀態 + `'lobby'` phase；`MainMenu` 加單人/多人分層，新增 `MultiplayerMenu.vue`/`WaitingRoom.vue`，App 持有 session 串接。進遊戲（lockstep）屬 4B-2、真 Playroom 屬 4C。

**Tech Stack:** TypeScript、Vue 3、Pinia、Vitest。

## Global Constraints

- 文件繁中；程式碼/型別/commit 英文。
- `engine/net/**` 純 TS、不得 import Vue/Pinia 執行期。
- **單人零退化**：單人路徑不經 session、與現況一致；既有測試不改且全綠。
- 玩家上限 `MAX_PLAYERS = 4`；開始條件＝房主 && ≥2 人 && 全員 ready。
- 4B-1 到「房主 start 觸發 onStart」為止（進遊戲留 4B-2）。
- commit 格式 `[mvp][type][scope] 描述` + 結尾 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。

---

## 檔案結構（本案異動）

| 檔案 | 異動 | 責任 |
|------|------|------|
| `src/engine/net/session.ts` | Create | `NetSession`/`LobbyPlayer`/`MAX_PLAYERS` |
| `src/engine/net/loopbackSession.ts` | Create | `LoopbackSession` |
| `src/engine/net/loopbackSession.test.ts` | Create | LoopbackSession 行為測試 |
| `src/stores/game.ts` | Modify | lobby 狀態 + `'lobby'` phase + `enterLobby`/`setLobby` + reset 清理 |
| `src/ui/MainMenu.vue` | Modify | 單人/多人分層（emit `multiplayer`） |
| `src/ui/MultiplayerMenu.vue` | Create | 建立/加入（輸入碼） |
| `src/ui/WaitingRoom.vue` | Create | 等待室 |
| `src/App.vue` | Modify | 持有 session、串接選單→等待室、onChange/onStart |

兩個 task：T1 NetSession + LoopbackSession（可測核心）；T2 store + UI 接線。

---

### Task 1: NetSession + LoopbackSession

**Files:**
- Create: `src/engine/net/session.ts`
- Create: `src/engine/net/loopbackSession.ts`
- Test: `src/engine/net/loopbackSession.test.ts`

**Interfaces:**
- Produces：`NetSession`、`LobbyPlayer`、`MAX_PLAYERS`、`LoopbackSession`。

- [ ] **Step 1: 寫失敗測試**

`src/engine/net/loopbackSession.test.ts`：

```ts
import { describe, it, expect, vi } from 'vitest'
import { LoopbackSession } from './loopbackSession'

describe('LoopbackSession', () => {
  it('建立者為房主、含本地玩家一人', () => {
    const s = new LoopbackSession()
    expect(s.isHost()).toBe(true)
    expect(s.players().length).toBe(1)
  })
  it('玩家上限 4', () => {
    const s = new LoopbackSession()
    s.addFakePlayer(); s.addFakePlayer(); s.addFakePlayer() // 共 4
    expect(s.players().length).toBe(4)
    expect(s.addFakePlayer()).toBe('') // 第 5 被略過
    expect(s.players().length).toBe(4)
  })
  it('setCharacter/setReady 改本地玩家並觸發 onChange', () => {
    const s = new LoopbackSession()
    const cb = vi.fn(); s.onChange(cb)
    s.setCharacter('neutrophil'); s.setReady(true)
    expect(s.players()[0].character).toBe('neutrophil')
    expect(s.players()[0].ready).toBe(true)
    expect(cb).toHaveBeenCalled()
  })
  it('房主 setMap', () => {
    const s = new LoopbackSession()
    s.setMap('stomach')
    expect(s.getMap()).toBe('stomach')
  })
  it('canStart：房主 + ≥2 人 + 全員就緒', () => {
    const s = new LoopbackSession()
    expect(s.canStart()).toBe(false)      // 僅 1 人
    s.addFakePlayer()                      // fake 預設 ready
    expect(s.canStart()).toBe(false)      // 本地未 ready
    s.setReady(true)
    expect(s.canStart()).toBe(true)
  })
  it('start 在 canStart 才觸發 onStart', () => {
    const s = new LoopbackSession({ map: 'lung' })
    const onStart = vi.fn(); s.onStart(onStart)
    s.start(123)
    expect(onStart).not.toHaveBeenCalled() // 條件不足
    s.addFakePlayer(); s.setReady(true)
    s.start(123)
    expect(onStart).toHaveBeenCalledWith(123, 'lung', expect.any(Array))
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/engine/net/loopbackSession.test.ts`
Expected: FAIL — 模組不存在。

- [ ] **Step 3: 建立 session.ts**

`src/engine/net/session.ts`：

```ts
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
```

- [ ] **Step 4: 建立 loopbackSession.ts**

`src/engine/net/loopbackSession.ts`：

```ts
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
```

- [ ] **Step 5: 跑測試 + 型別**

Run: `npx vitest run src/engine/net/loopbackSession.test.ts && npm run typecheck`
Expected: PASS（6 筆）；typecheck 乾淨。

- [ ] **Step 6: Commit**

```bash
git add src/engine/net/session.ts src/engine/net/loopbackSession.ts src/engine/net/loopbackSession.test.ts
git commit -m "$(printf '%s\n\n%s' '[mvp][feat][engine] NetSession 抽象 + LoopbackSession（等待室會話）' 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 2: store lobby 狀態 + 選單分層 + 等待室 UI + App 接線

**Files:**
- Modify: `src/stores/game.ts`
- Modify: `src/ui/MainMenu.vue`
- Create: `src/ui/MultiplayerMenu.vue`
- Create: `src/ui/WaitingRoom.vue`
- Modify: `src/App.vue`

**Interfaces:**
- Consumes：T1 的 `NetSession`/`LobbyPlayer`/`LoopbackSession`；`CHARACTER_ORDER`/`MAP_ORDER`/`*_DEFS`。
- Produces：store `lobbyPlayers`/`roomCode`/`isHost`/`lobbyMap`/`canStart` + `enterLobby`/`setLobby`；`'lobby'` phase；`MultiplayerMenu`/`WaitingRoom`。

- [ ] **Step 1: store lobby 狀態（game.ts）**

`Phase` 加 `'lobby'`：

```ts
export type Phase = 'menu' | 'playing' | 'upgrading' | 'over' | 'paused' | 'won' | 'lobby'
```

`State`/state() 新增（import `LobbyPlayer`：`import type { LobbyPlayer } from '../engine/net/session'`，並 `MapKind` 已可用）：

```ts
  // State
  lobbyPlayers: LobbyPlayer[]
  roomCode: string
  isHost: boolean
  lobbyMap: MapKind
  canStart: boolean
```
state() 初值：

```ts
    lobbyPlayers: [],
    roomCode: '',
    isHost: false,
    lobbyMap: 'vessel',
    canStart: false,
```
新增 actions：

```ts
    /** 進入等待室（建立/加入後）。 */
    enterLobby() { this.phase = 'lobby' },
    /** 引擎/App → store：更新等待室狀態。 */
    setLobby(s: { players: LobbyPlayer[]; roomCode: string; isHost: boolean; map: MapKind; canStart: boolean }) {
      this.lobbyPlayers = s.players
      this.roomCode = s.roomCode
      this.isHost = s.isHost
      this.lobbyMap = s.map
      this.canStart = s.canStart
    },
```
`toMenu()` action 內清理 lobby：

```ts
      this.lobbyPlayers = []
      this.roomCode = ''
      this.isHost = false
      this.canStart = false
```

> `MapKind` 型別：game.ts **尚未 import**——把 line 13 `import type { WeaponKind, PassiveKind, CharacterKind } from '../engine/types'` 補成 `import type { WeaponKind, PassiveKind, CharacterKind, MapKind } from '../engine/types'`。`LobbyPlayer` 另從 `'../engine/net/session'` type-import。

- [ ] **Step 2: MainMenu 單人/多人分層（MainMenu.vue）**

`defineEmits` 加 `multiplayer`：

```ts
const emit = defineEmits<{
  start: [opts: { character: CharacterKind; map: MapKind }]
  'open-leaderboard': []
  multiplayer: []
}>()
```
在「開始遊戲」按鈕之後加多人按鈕：

```vue
      <button class="ui-btn ui-btn-primary start" @click="emit('start', { character, map })">單人遊玩</button>
      <button class="ui-btn ui-btn-ghost" @click="emit('multiplayer')">多人遊玩</button>
```

> 把原「開始遊戲」改文字為「單人遊玩」；其餘選角/選圖（單人用）不變。

- [ ] **Step 3: MultiplayerMenu.vue（建立）**

`src/ui/MultiplayerMenu.vue`：

```vue
<script setup lang="ts">
/** MultiplayerMenu.vue — 多人：建立或加入房間（輸入邀請碼）。真連線屬 4C。 */
import { ref } from 'vue'
import Overlay from './Overlay.vue'
import Panel from './Panel.vue'

const emit = defineEmits<{ create: []; join: [code: string]; back: [] }>()
const code = ref('')
</script>

<template>
  <Overlay>
    <Panel class="mp-panel">
      <h1>多人遊玩</h1>
      <button class="ui-btn ui-btn-primary" @click="emit('create')">建立房間</button>
      <div class="join">
        <input v-model="code" class="code-input" placeholder="輸入邀請碼" maxlength="8" />
        <button class="ui-btn ui-btn-primary" :disabled="!code" @click="emit('join', code.trim())">加入</button>
      </div>
      <button class="ui-btn ui-btn-ghost" @click="emit('back')">返回</button>
    </Panel>
  </Overlay>
</template>

<style scoped>
.mp-panel { gap: 1rem; }
h1 { font-family: var(--font-display); letter-spacing: 0.08em; }
.join { display: flex; gap: 0.5rem; }
.code-input { padding: 0.5rem 0.8rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.3);
  background: rgba(255,255,255,0.06); color: #fff; font-size: 1rem; text-transform: uppercase; }
</style>
```

- [ ] **Step 4: WaitingRoom.vue（建立）**

`src/ui/WaitingRoom.vue`：

```vue
<script setup lang="ts">
/** WaitingRoom.vue — 等待室（phase==='lobby'）：玩家列表/角色/就緒；房主選圖 + 開始。 */
import { ref } from 'vue'
import { useGameStore } from '../stores/game'
import { CHARACTER_ORDER, CHARACTER_DEFS } from '../engine/systems/characterDefs'
import { MAP_ORDER, MAP_DEFS } from '../engine/systems/mapDefs'
import type { CharacterKind, MapKind } from '../engine/types'
import Overlay from './Overlay.vue'
import Panel from './Panel.vue'

const store = useGameStore()
const emit = defineEmits<{
  'set-character': [kind: CharacterKind]
  'set-ready': [ready: boolean]
  'set-map': [kind: MapKind]
  start: []
  leave: []
}>()
const ready = ref(false)
function css(c: number): string { return '#' + c.toString(16).padStart(6, '0') }
function toggleReady() { ready.value = !ready.value; emit('set-ready', ready.value) }
</script>

<template>
  <Overlay>
    <Panel class="wr-panel">
      <h1>等待室</h1>
      <div class="code">邀請碼：<b>{{ store.roomCode }}</b></div>

      <div class="section-label">玩家（{{ store.lobbyPlayers.length }}/4）</div>
      <div class="players">
        <div v-for="p in store.lobbyPlayers" :key="p.id" class="player" :class="{ ready: p.ready }">
          <span class="name" :style="{ color: css(CHARACTER_DEFS[p.character].color) }">{{ CHARACTER_DEFS[p.character].name }}</span>
          <span class="badge">{{ p.ready ? '就緒' : '未就緒' }}</span>
        </div>
      </div>

      <div class="section-label">選擇角色</div>
      <div class="row">
        <button v-for="kind in CHARACTER_ORDER" :key="kind" class="card"
          :style="{ borderColor: css(CHARACTER_DEFS[kind].color) }" @click="emit('set-character', kind)">
          {{ CHARACTER_DEFS[kind].name }}
        </button>
      </div>

      <template v-if="store.isHost">
        <div class="section-label">地圖（房主）</div>
        <div class="row">
          <button v-for="kind in MAP_ORDER" :key="kind" class="card"
            :class="{ active: store.lobbyMap === kind }" @click="emit('set-map', kind)">
            {{ MAP_DEFS[kind].name }}
          </button>
        </div>
      </template>

      <div class="actions">
        <button class="ui-btn ui-btn-primary" @click="toggleReady">{{ ready ? '取消就緒' : '我已就緒' }}</button>
        <button v-if="store.isHost" class="ui-btn ui-btn-primary" :disabled="!store.canStart" @click="emit('start')">開始</button>
        <button class="ui-btn ui-btn-ghost" @click="emit('leave')">離開</button>
      </div>
    </Panel>
  </Overlay>
</template>

<style scoped>
.wr-panel { gap: 0.6rem; }
h1 { font-family: var(--font-display); letter-spacing: 0.08em; }
.code b { color: var(--immune-accent-strong, #ffd54a); letter-spacing: 0.2em; }
.section-label { font-size: 0.85rem; opacity: 0.7; letter-spacing: 0.2em; margin-top: 0.3rem; }
.players { display: flex; gap: 0.6rem; flex-wrap: wrap; justify-content: center; }
.player { display: flex; flex-direction: column; align-items: center; padding: 0.4rem 0.7rem;
  border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; }
.player.ready { border-color: #5bff8c; }
.badge { font-size: 0.7rem; opacity: 0.8; }
.row { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; max-width: 90vw; }
.card { padding: 0.4rem 0.7rem; border: 2px solid rgba(255,255,255,0.2); border-radius: 8px;
  background: rgba(255,255,255,0.06); color: #fff; cursor: pointer; }
.card.active { background: rgba(255,255,255,0.16); }
.actions { display: flex; gap: 0.6rem; margin-top: 0.5rem; }
</style>
```

- [ ] **Step 5: App 接線（App.vue）**

import + state：

```ts
import MultiplayerMenu from './ui/MultiplayerMenu.vue'
import WaitingRoom from './ui/WaitingRoom.vue'
import { LoopbackSession } from './engine/net/loopbackSession'
import type { NetSession } from './engine/net/session'
```
新增 ref + session 持有與處理函式（與既有 `game`/`startGame` 同層）：

```ts
const showMultiMenu = ref(false)
let session: NetSession | null = null

function pushLobby() {
  if (!session) return
  store.setLobby({
    players: session.players().map((p) => ({ ...p })),
    roomCode: session.roomCode,
    isHost: session.isHost(),
    map: session.getMap(),
    canStart: session.canStart(),
  })
}
function openMultiplayer() { showMultiMenu.value = true }
function createOrJoin(code?: string) {
  session = new LoopbackSession({ roomCode: code || 'ROOM' + Math.floor(Math.random() * 9000 + 1000) })
  session.onChange(pushLobby)
  session.onStart((seed, map, players) => {
    // 4B-2 接：以 LockstepRunner + NetTransport 開多人局。本份先記錄。
    console.info('[lobby] onStart', seed, map, players)
  })
  showMultiMenu.value = false
  pushLobby()
  store.enterLobby()
}
function leaveLobby() {
  session?.leave(); session = null
  store.toMenu()
}
```

> `createOrJoin` 用 `Math.random` 產假房間碼屬**呈現/驅動層**（非模擬路徑，符合確定性守護排除清單）。

template（既有 MainMenu render 行附近）改/加：

```vue
    <Transition name="fade"><MainMenu v-if="store.phase === 'menu' && !showMultiMenu" :stats="stats" @start="startGame" @open-leaderboard="showLeaderboard = true" @multiplayer="openMultiplayer" /></Transition>
    <Transition name="fade"><MultiplayerMenu v-if="store.phase === 'menu' && showMultiMenu" @create="createOrJoin()" @join="(c) => createOrJoin(c)" @back="showMultiMenu = false" /></Transition>
    <Transition name="fade"><WaitingRoom v-if="store.phase === 'lobby'"
      @set-character="(k) => { session?.setCharacter(k) }"
      @set-ready="(r) => { session?.setReady(r) }"
      @set-map="(k) => { session?.setMap(k) }"
      @start="() => { session?.start(Math.floor(Math.random()*1e9)) }"
      @leave="leaveLobby" /></Transition>
```

- [ ] **Step 6: 型別 + 全測試 + build**

Run: `npm run typecheck && npm test && npm run build`
Expected: 乾淨；既有測試全綠（單人路徑未動）。

- [ ] **Step 7: Commit**

```bash
git add src/stores/game.ts src/ui/MainMenu.vue src/ui/MultiplayerMenu.vue src/ui/WaitingRoom.vue src/App.vue
git commit -m "$(printf '%s\n\n%s' '[mvp][feat][ui] 主選單單人/多人分層 + 多人選單 + 等待室（LoopbackSession 驅動）' 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## 實機驗證（兩 task 後）
- [ ] `npm run dev`：單人遊玩**與現況無差異**（「單人遊玩」按鈕 → 選角/選圖 → 開局）。
- [ ] 多人遊玩 → 建立房間 → 等待室顯示房間碼/本地玩家；選角/就緒可操作；（房主開始需 ≥2 人，本地以 addFakePlayer 或單人時開始鈕禁用屬正常）。
- [ ] `npm run build` 乾淨；更新 `acceptance.md` + `progress.md`。

---

## Self-Review（plan 對照 spec）
- **Spec coverage：** FR-1 NetSession→T1 S3；FR-2 LoopbackSession→T1 S4；FR-3 store→T2 S1；FR-4 UI→T2 S2-5；FR-5 單人零退化→各 task（不經 session、預設值）。Edge：未滿/未就緒 canStart false（T1 測試 + WaitingRoom disabled）、上限（T1 測試）、離開（leaveLobby）。
- **Placeholder scan：** 無 TBD；元件/store/App 皆給完整碼。onStart 的 4B-2 接點明確標示為本份 console（非占位，是刻意分界）。
- **Type consistency：** `NetSession`/`LobbyPlayer`/`MAX_PLAYERS`/`LoopbackSession`/`enterLobby`/`setLobby`/`lobbyPlayers`/`roomCode`/`isHost`/`lobbyMap`/`canStart`/`'lobby'` phase 全程一致。
