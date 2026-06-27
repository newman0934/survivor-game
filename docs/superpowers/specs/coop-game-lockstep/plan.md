# coop-game-lockstep (4B-2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `LockstepRunner` 接進 `Game` 開多人局（`Game.startMultiplayer`），升級走 pick（M-1）；`NetSession.toTransport` 提供 in-game 傳輸（loopback 對非本地玩家自動補中性，單機可跑）。單人零退化。

**Architecture:** `NetSession.toTransport(localIndex)` 回 in-game `NetTransport`（LoopbackSession 自動補中性）；`Game` 加 `runner`/`pendingPick`，loop 以 `if (this.runner)` 分多人/單人兩支（單人不動）；多人每幀 submitLocalInput + drain tryAdvance + summary/setMultiOffer + hasWon/hasLost。App onStart → Game.startMultiplayer。

**Tech Stack:** TypeScript、Vue 3、Pinia、PixiJS、Vitest。

## Global Constraints

- 文件繁中；程式碼/型別/commit 英文。
- **單人零退化**：`runner===null` 即單人；單人迴圈/暫停握手/UpgradeModal 不變；既有測試不改且全綠。
- 多人推進全經 `LockstepRunner`（4A，依 index、固定步長、seeded）；M-1：多人不呼叫 consumeLevelUp、不暫停、升級走 pick。
- `engine/net/**`/World 純 TS；Game 膠水層；不引入時間/亂數於模擬。
- commit 格式 `[mvp][type][scope] 描述` + 結尾 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。

---

## 檔案結構（本案異動）

| 檔案 | 異動 | 責任 |
|------|------|------|
| `src/engine/net/session.ts` | Modify | `NetSession` 加 `toTransport(localIndex)` |
| `src/engine/net/loopbackSession.ts` | Modify | 實作 `toTransport`（auto-neutral） |
| `src/engine/net/loopbackSession.test.ts` | Modify | toTransport + 多人推進整合測試 |
| `src/engine/Game.ts` | Modify | `runner`/`pendingPick` + `startMultiplayer` + loop 多人分支 |
| `src/App.vue` | Modify | onStart → startMultiplayer |

兩個 task：T1 toTransport + 整合測試（可測）；T2 Game 多人模式 + App 接線（膠水）。

---

### Task 1: NetSession.toTransport + LoopbackSession auto-neutral + 整合測試

**Files:**
- Modify: `src/engine/net/session.ts`
- Modify: `src/engine/net/loopbackSession.ts`
- Test: `src/engine/net/loopbackSession.test.ts`

**Interfaces:**
- Consumes：4A `NetTransport`/`PlayerInput`；`World`/`LockstepRunner`（整合測試）。
- Produces：`NetSession.toTransport(localIndex): NetTransport`；LoopbackSession 實作。

- [ ] **Step 1: 寫失敗測試（附加到 loopbackSession.test.ts）**

```ts
import { World } from '../World'
import { LockstepRunner } from './lockstep'

describe('LoopbackSession.toTransport（4B-2）', () => {
  it('只送本地輸入即可取得整幀（非本地自動補中性）', () => {
    const s = new LoopbackSession()
    s.addFakePlayer() // 2 玩家
    const t = s.toTransport(0)
    expect(t.playerCount).toBe(2)
    expect(t.inputsForTick(0)).toBeNull()          // 本地未送
    t.sendInput(0, { move: { x: 1, y: 0 } })
    const inputs = t.inputsForTick(0)
    expect(inputs).not.toBeNull()
    expect(inputs![0].move.x).toBe(1)              // 本地
    expect(inputs![1].move).toEqual({ x: 0, y: 0 }) // 非本地自動中性
  })

  it('runner + auto-neutral transport：單機多人持續推進', () => {
    const s = new LoopbackSession()
    s.addFakePlayer()
    const w = new World(1, ['macrophage', 'neutrophil'])
    const r = new LockstepRunner(w, s.toTransport(0))
    const x0 = w.players[0].entity.pos.x
    for (let f = 0; f < 60; f++) {
      r.submitLocalInput({ move: { x: 1, y: 0 } })
      while (r.tryAdvance()) { /* */ }
    }
    expect(r.getCurrentTick()).toBeGreaterThan(0) // 有推進、未停滯
    expect(w.players[0].entity.pos.x).toBeGreaterThan(x0) // 本地玩家右移
  })

  it('全員死亡 → world.hasLost 為 true', () => {
    const s = new LoopbackSession()
    s.addFakePlayer()
    const w = new World(1, ['macrophage', 'neutrophil'])
    const r = new LockstepRunner(w, s.toTransport(0))
    w.players[0].entity.hp = 0; w.players[1].entity.hp = 0
    r.submitLocalInput({ move: { x: 0, y: 0 } })
    while (r.tryAdvance()) { /* */ }
    expect(w.hasLost()).toBe(true)
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/engine/net/loopbackSession.test.ts -t "toTransport"`
Expected: FAIL — `toTransport` 不存在。

- [ ] **Step 3: NetSession 介面加 toTransport（session.ts）**

在 `NetSession` 介面（`leave()` 附近）新增，並 import 型別：

```ts
import type { NetTransport } from './types'
```
介面內加：

```ts
  /** 進遊戲時產生逐幀輸入傳輸（lockstep 用）。 */
  toTransport(localIndex: number): NetTransport
```

- [ ] **Step 4: LoopbackSession 實作 toTransport（loopbackSession.ts）**

import：

```ts
import type { NetTransport, PlayerInput } from './types'
```
新增方法（class 內）：

```ts
  /** in-game 傳輸：本地輸入經此送出；非本地玩家每 tick 自動補中性（單機可跑、隊友待命）。 */
  toTransport(localIndex: number): NetTransport {
    const playerCount = this.list.length
    const local = new Map<number, PlayerInput>()
    return {
      playerCount,
      localIndex,
      sendInput(tick: number, input: PlayerInput): void { local.set(tick, input) },
      inputsForTick(tick: number): PlayerInput[] | null {
        const mine = local.get(tick)
        if (!mine) return null
        const arr: PlayerInput[] = []
        for (let i = 0; i < playerCount; i++) {
          arr.push(i === localIndex ? mine : { move: { x: 0, y: 0 } })
        }
        return arr
      },
    }
  }
```

- [ ] **Step 5: 跑測試 + 型別 + 全測試**

Run: `npx vitest run src/engine/net/loopbackSession.test.ts && npm run typecheck && npm test`
Expected: 新 3 筆 PASS；既有全綠；typecheck 乾淨。

- [ ] **Step 6: Commit**

```bash
git add src/engine/net/session.ts src/engine/net/loopbackSession.ts src/engine/net/loopbackSession.test.ts
git commit -m "$(printf '%s\n\n%s' '[mvp][feat][engine] NetSession.toTransport（LoopbackSession auto-neutral，單機多人可跑）' 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 2: Game 多人模式 + App onStart 接線

**Files:**
- Modify: `src/engine/Game.ts`
- Modify: `src/App.vue`

**Interfaces:**
- Consumes：T1 的 `toTransport`；4A `LockstepRunner`/`NetTransport`/`PlayerInput`；`World(seed, characters[], map)`。
- Produces：`Game.startMultiplayer(...)`。

- [ ] **Step 1: Game imports + 欄位（Game.ts）**

import：

```ts
import { LockstepRunner } from './net/lockstep'
import type { NetTransport, PlayerInput } from './net/types'
```
欄位（`upgradeRng` 附近）：

```ts
  /** 多人 lockstep 協調器；單人為 null（決定 loop 走哪一支）。 */
  private runner: LockstepRunner | null = null
  /** 本地玩家這幀待送的升級選擇（多人 pick）；送出後清空。 */
  private pendingPick: string | null = null
```

- [ ] **Step 2: Game.startMultiplayer（Game.ts）**

在 `start` 之後新增：

```ts
  /**
   * 建立並啟動一場多人局（lockstep）。
   * @param characters 各玩家角色（依玩家 index）。
   * @param transport in-game 逐幀輸入傳輸（由 NetSession.toTransport 提供）。
   * @param localIndex 本地玩家索引。
   */
  static async startMultiplayer(
    canvasParent: HTMLElement, seed: number, characters: CharacterKind[], map: MapKind,
    transport: NetTransport, localIndex: number, bloomEnabled = true,
  ): Promise<Game> {
    const world = new World(seed, characters, map)
    const renderer = await PixiRenderer.create(canvasParent, bloomEnabled)
    const game = new Game(world, renderer, seed, localIndex)
    game.runner = new LockstepRunner(world, transport)
    game.store.setLoadout(world.loadoutSnapshot(localIndex))
    game.input.attach()
    game.touch.attach(canvasParent)
    soundManager.resume()
    soundManager.startMusic(map)
    // M-1：多人升級走 pick；本地選定 → 下次 submitLocalInput 帶上。
    game.store.onMultiUpgradePicked = (id: string) => { game.pendingPick = id }
    game.loop(0)
    return game
  }
```

- [ ] **Step 3: loop 分多人/單人兩支（Game.ts）**

把 `loop` 內 `if (!this.paused && !this.renderer.isHitStopped()) { … }` 區塊改為先算 dir 再分支（單人分支＝原邏輯不動）：

```ts
    if (!this.paused && !this.renderer.isHitStopped()) {
      const tdir = this.touch.direction()
      const dir = (tdir.x !== 0 || tdir.y !== 0) ? tdir : this.input.direction()
      this.accumulator += frameTime

      if (this.runner) {
        // 多人：每 STEP 送一筆本地輸入（含 pick），再把到齊的 tick 推到底。
        while (this.accumulator >= STEP) {
          this.runner.submitLocalInput({ move: dir, pick: this.pendingPick })
          this.pendingPick = null
          this.accumulator -= STEP
        }
        while (this.runner.tryAdvance()) { /* drain ready ticks */ }
        if (this.world.hasWon()) {
          this.store.updateSummary(this.world.summary(this.localPlayerIndex))
          soundManager.play('chest'); this.store.victory(); this.stop(); return
        }
        if (this.world.hasLost()) {
          this.store.updateSummary(this.world.summary(this.localPlayerIndex))
          soundManager.play('gameover'); this.store.gameOver(); this.stop(); return
        }
      } else {
        // 單人：既有邏輯（設輸入 + 固定步長消化 + 升級暫停握手 + 勝利/死亡）。
        this.world.setMoveInput(this.localPlayerIndex, dir)
        while (this.accumulator >= STEP) {
          this.world.step(STEP)
          this.accumulator -= STEP
          if (this.world.consumeLevelUp()) {
            const opts = rollUpgrades(this.upgradeRng, 3, this.world.upgradeContext())
            this.store.setLoadout(this.world.loadoutSnapshot(this.localPlayerIndex))
            this.store.offerUpgrades(opts.map((o) => ({ id: o.id, label: o.label })))
            this.store.onUpgradePicked = (id: string) => {
              this.world.applyUpgrade(id)
              this.store.setLoadout(this.world.loadoutSnapshot(this.localPlayerIndex))
              this.paused = false
            }
            this.paused = true
            break
          }
          if (this.world.hasWon()) {
            this.store.updateSummary(this.world.summary(this.localPlayerIndex))
            soundManager.play('chest'); this.store.victory(); this.stop(); return
          }
          if (this.world.isPlayerDead()) {
            this.store.updateSummary(this.world.summary(this.localPlayerIndex))
            soundManager.play('gameover'); this.store.gameOver(); this.stop(); return
          }
        }
      }

      // 共用尾段：推 summary + 多人 offer + 排空音效/fx（playerCount 1 不推 multiOffer）。
      this.store.updateSummary(this.world.summary(this.localPlayerIndex))
      if (this.world.playerCount > 1) {
        this.store.setMultiOffer(
          this.world.pendingOfferFor(this.localPlayerIndex),
          this.world.upgradeTimeRemaining(this.localPlayerIndex),
        )
      }
      for (const ev of this.world.consumeSoundEvents()) soundManager.play(ev)
      this.renderer.applyFxEvents(this.world.consumeFxEvents())
    }
```

> 單人分支與原碼**逐行等價**（只是被 `else` 包住、dir 提前算）；共用尾段沿用 SP3 既有內容。

- [ ] **Step 4: 型別 + 全測試 + build（驗單人零退化）**

Run: `npm run typecheck && npm test && npm run build`
Expected: 乾淨；既有測試全綠（單人分支等價）。

- [ ] **Step 5: App onStart → startMultiplayer（App.vue）**

import 補：

```ts
import type { CharacterKind } from './engine/types'  // 若未含
```
把 `createOrJoin` 的 `onStart` 由 console 改為開多人局：

```ts
  session.onStart(async (seed, map, players) => {
    if (!session || !canvasParent.value) return
    const localIndex = players.findIndex((p) => p.id === session!.localId)
    store.setCharacter(players[localIndex]?.character ?? 'macrophage')
    store.start() // phase → playing
    game = await Game.startMultiplayer(
      canvasParent.value, seed, players.map((p) => p.character), map,
      session.toTransport(localIndex), localIndex, bloomEnabled.value,
    )
  })
```

> `canvasParent`/`game`/`bloomEnabled`/`store` 為 App 既有；`Game` 已 import。`store.start()` 把 phase 設 playing（HUD/多人浮層即運作）。

- [ ] **Step 6: 型別 + build**

Run: `npm run typecheck && npm run build`
Expected: 乾淨。

- [ ] **Step 7: Commit**

```bash
git add src/engine/Game.ts src/App.vue
git commit -m "$(printf '%s\n\n%s' '[mvp][feat][engine] Game.startMultiplayer + loop 多人 lockstep 分支（M-1）+ App onStart 接線' 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## 實機驗證（兩 task 後）
- [ ] `npm run dev`：單人遊玩**與現況無差異**。
- [ ] 多人遊玩 → 建立房間 → （以 addFakePlayer 模擬或之後 4C）就緒 → 開始 → 多人局**跑起來**（你操作、隊友待命、不崩潰）。
- [ ] `npm run build` 乾淨；更新 `acceptance.md` + `progress.md`。

---

## Self-Review（plan 對照 spec）
- **Spec coverage：** FR-1 toTransport→T1；FR-2 startMultiplayer→T2 S2；FR-3 多人迴圈/M-1→T2 S3；FR-4 App 接線→T2 S5；FR-5 單人零退化→T2 單人分支逐行等價 + runner=null gate。Edge：localIndex 由 id 找、全員死 hasLost、pick 保留至下次 submit、loopback 隊友自動中性、stop 冪等（既有）。
- **Placeholder scan：** 無 TBD；改碼步驟含完整碼。
- **Type consistency：** `toTransport`/`NetTransport`/`PlayerInput`/`LockstepRunner`/`startMultiplayer`/`runner`/`pendingPick`/`onMultiUpgradePicked`（SP3）/`summary(i)`/`pendingOfferFor`/`upgradeTimeRemaining`（1B/SP3）全程一致。
