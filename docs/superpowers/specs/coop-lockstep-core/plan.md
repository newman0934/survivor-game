# coop-lockstep-core (4A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增傳輸無關的 lockstep 核心（`NetTransport` 抽象 + `LoopbackTransport` + `LockstepRunner`），以 `World.checksum()` 驗多端同步；純新增 `engine/net/`，不動既有檔。

**Architecture:** `engine/net/types.ts` 定義 `PlayerInput`/`TickInputs`/`NetTransport`；`loopbackTransport.ts` 提供行程內 bus 聚合 N 玩家每 tick 輸入；`lockstep.ts` 的 `LockstepRunner` 以固定 inputDelay 緩衝、輸入到齊才依 index 套用（move + pick→chooseUpgrade）並 `world.step`。消費既有 `World.setMoveInput/chooseUpgrade/step/checksum`，零既有檔變更。

**Tech Stack:** TypeScript、Vitest。

## Global Constraints

- 文件繁中；程式碼/型別/commit 英文。
- **純新增 `src/engine/net/**` + 測試；不改 World/Game/store/UI/renderer**（零退化）。
- `engine/net/**` 純 TS、不得 import Vue/Pinia/renderer/UI；不呼叫時間/亂數。
- 全程依玩家 index 升冪套用輸入；inputDelay 預設 2；升級走 `pick` 輸入。
- 消費既有 World API（1A/1B/SP2）：`setMoveInput(i,dir)`、`chooseUpgrade(i,id)`、`step(dt)`、`checksum()`、`players`、建構子 `new World(seed, CharacterKind[])`。
- commit 格式 `[mvp][type][scope] 描述` + 結尾 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。

---

## 檔案結構（本案異動）

| 檔案 | 異動 | 責任 |
|------|------|------|
| `src/engine/net/types.ts` | Create | `PlayerInput`/`TickInputs`/`NetTransport` |
| `src/engine/net/loopbackTransport.ts` | Create | `LoopbackBus` + `LoopbackTransport` |
| `src/engine/net/loopbackTransport.test.ts` | Create | transport 聚合測試 |
| `src/engine/net/lockstep.ts` | Create | `LockstepRunner` |
| `src/engine/net/lockstep.test.ts` | Create | 兩端同步/停滯/延遲/pick/確定性 |

兩個 task：T1 types + loopback；T2 LockstepRunner。

---

### Task 1: net/types.ts + loopbackTransport.ts

**Files:**
- Create: `src/engine/net/types.ts`
- Create: `src/engine/net/loopbackTransport.ts`
- Test: `src/engine/net/loopbackTransport.test.ts`

**Interfaces:**
- Produces：`PlayerInput`、`TickInputs`、`NetTransport`；`LoopbackBus`、`LoopbackTransport`。

- [ ] **Step 1: 寫失敗測試**

`src/engine/net/loopbackTransport.test.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { LoopbackBus, LoopbackTransport } from './loopbackTransport'
import type { PlayerInput } from './types'

const mv = (x: number, y: number): PlayerInput => ({ move: { x, y } })

describe('LoopbackTransport', () => {
  it('全員到齊才回 TickInputs', () => {
    const bus = new LoopbackBus()
    const t0 = new LoopbackTransport(bus, 2, 0)
    const t1 = new LoopbackTransport(bus, 2, 1)
    t0.sendInput(0, mv(1, 0))
    expect(t0.inputsForTick(0)).toBeNull() // 玩家 1 未到
    t1.sendInput(0, mv(-1, 0))
    const inputs = t0.inputsForTick(0)
    expect(inputs).not.toBeNull()
    expect(inputs!.length).toBe(2)
    expect(inputs![0].move.x).toBe(1)
    expect(inputs![1].move.x).toBe(-1)
  })
  it('唯讀屬性 playerCount/localIndex', () => {
    const t = new LoopbackTransport(new LoopbackBus(), 3, 2)
    expect(t.playerCount).toBe(3)
    expect(t.localIndex).toBe(2)
  })
  it('不同 tick 互不干擾', () => {
    const bus = new LoopbackBus()
    const t0 = new LoopbackTransport(bus, 1, 0)
    t0.sendInput(5, mv(1, 1))
    expect(t0.inputsForTick(0)).toBeNull()
    expect(t0.inputsForTick(5)).not.toBeNull()
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/engine/net/loopbackTransport.test.ts`
Expected: FAIL — 模組不存在。

- [ ] **Step 3: 建立 types.ts**

`src/engine/net/types.ts`：

```ts
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
}
```

- [ ] **Step 4: 建立 loopbackTransport.ts**

`src/engine/net/loopbackTransport.ts`：

```ts
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
```

- [ ] **Step 5: 跑測試確認通過 + 型別**

Run: `npx vitest run src/engine/net/loopbackTransport.test.ts && npm run typecheck`
Expected: PASS（3 筆）；typecheck 乾淨。

- [ ] **Step 6: Commit**

```bash
git add src/engine/net/types.ts src/engine/net/loopbackTransport.ts src/engine/net/loopbackTransport.test.ts
git commit -m "$(printf '%s\n\n%s' '[mvp][feat][engine] lockstep 傳輸抽象 NetTransport + LoopbackTransport' 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 2: net/lockstep.ts（LockstepRunner）

**Files:**
- Create: `src/engine/net/lockstep.ts`
- Test: `src/engine/net/lockstep.test.ts`

**Interfaces:**
- Consumes：T1 的 `NetTransport`/`PlayerInput`；`LoopbackBus`/`LoopbackTransport`（測試）；`World`（`setMoveInput`/`chooseUpgrade`/`step`/`checksum`/`players`/`pendingOfferFor`）。
- Produces：`LockstepRunner`。

- [ ] **Step 1: 寫失敗測試**

`src/engine/net/lockstep.test.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { World } from '../World'
import { LoopbackBus, LoopbackTransport } from './loopbackTransport'
import { LockstepRunner } from './lockstep'
import type { PlayerInput } from './types'

const mv = (x: number, y: number): PlayerInput => ({ move: { x, y } })

describe('LockstepRunner', () => {
  it('兩 runner 經共享 bus 每 tick checksum 完全相同', () => {
    const bus = new LoopbackBus()
    const w0 = new World(42, ['macrophage', 'neutrophil'])
    const w1 = new World(42, ['macrophage', 'neutrophil'])
    const r0 = new LockstepRunner(w0, new LoopbackTransport(bus, 2, 0))
    const r1 = new LockstepRunner(w1, new LoopbackTransport(bus, 2, 1))
    for (let f = 0; f < 200; f++) {
      r0.submitLocalInput(mv(f % 2 ? 1 : -1, 0))
      r1.submitLocalInput(mv(0, f % 3 ? 1 : -1))
      while (r0.tryAdvance()) { /* 推到底 */ }
      while (r1.tryAdvance()) { /* 推到底 */ }
      expect(r0.getCurrentTick()).toBe(r1.getCurrentTick())
      expect(r0.checksum()).toBe(r1.checksum())
    }
  })

  it('缺輸入時 tryAdvance 停滯、到齊後恢復', () => {
    const bus = new LoopbackBus()
    const w = new World(1, ['macrophage', 'neutrophil'])
    const r0 = new LockstepRunner(w, new LoopbackTransport(bus, 2, 0))
    const t1 = new LoopbackTransport(bus, 2, 1)
    expect(r0.tryAdvance()).toBe(false) // tick0 缺玩家 1
    t1.sendInput(0, mv(0, 0))
    t1.sendInput(1, mv(0, 0))
    expect(r0.tryAdvance()).toBe(true)  // tick0 到齊
    expect(r0.getCurrentTick()).toBe(1)
  })

  it('inputDelay=2：本地輸入於 tick+2 套用', () => {
    const bus = new LoopbackBus()
    const w = new World(1) // 單人 playerCount 1
    const r = new LockstepRunner(w, new LoopbackTransport(bus, 1, 0), 2)
    const x0 = w.players[0].entity.pos.x
    r.submitLocalInput(mv(1, 0)) // → tick 2
    expect(r.tryAdvance()).toBe(true) // tick0（中性預送）
    expect(r.tryAdvance()).toBe(true) // tick1（中性預送）
    expect(w.players[0].entity.pos.x).toBe(x0) // 前兩 tick 未移動
    expect(r.tryAdvance()).toBe(true) // tick2（套用本地輸入）
    expect(w.players[0].entity.pos.x).toBeGreaterThan(x0)
  })

  it('pick 於該 tick 以 chooseUpgrade 套用', () => {
    const bus = new LoopbackBus()
    const w = new World(1, ['macrophage', 'neutrophil'])
    w.players[1].pendingLevelUps = 1
    const r0 = new LockstepRunner(w, new LoopbackTransport(bus, 2, 0))
    const t1 = new LoopbackTransport(bus, 2, 1)
    // 玩家 1 的預送窗（tick0,1 中性）
    t1.sendInput(0, mv(0, 0))
    t1.sendInput(1, mv(0, 0))
    expect(r0.tryAdvance()).toBe(true) // tick0 → step → processUpgrades 產生玩家1待選
    const id = w.pendingOfferFor(1)![0].id
    expect(id).toBeTruthy()
    // tick2：玩家0 中性、玩家1 帶 pick
    r0.submitLocalInput(mv(0, 0))           // 玩家0 → tick2
    t1.sendInput(2, { move: { x: 0, y: 0 }, pick: id }) // 玩家1 → tick2 帶 pick
    expect(r0.tryAdvance()).toBe(true) // tick1（中性）
    expect(r0.tryAdvance()).toBe(true) // tick2（套 pick）
    expect(w.pendingOfferFor(1)).toBeNull() // 已選定、待選清空
  })

  it('相同 seed + 相同腳本兩跑 checksum 一致', () => {
    const run = () => {
      const bus = new LoopbackBus()
      const w0 = new World(7, ['macrophage', 'neutrophil'])
      const w1 = new World(7, ['macrophage', 'neutrophil'])
      const r0 = new LockstepRunner(w0, new LoopbackTransport(bus, 2, 0))
      const r1 = new LockstepRunner(w1, new LoopbackTransport(bus, 2, 1))
      for (let f = 0; f < 120; f++) {
        r0.submitLocalInput(mv(1, 0)); r1.submitLocalInput(mv(0, 1))
        while (r0.tryAdvance()) { /* */ }
        while (r1.tryAdvance()) { /* */ }
      }
      return r0.checksum()
    }
    expect(run()).toBe(run())
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/engine/net/lockstep.test.ts`
Expected: FAIL — `LockstepRunner` 不存在。

- [ ] **Step 3: 實作 lockstep.ts**

`src/engine/net/lockstep.ts`：

```ts
/**
 * Lockstep 協調器：以固定 inputDelay 緩衝，每 tick 全員輸入到齊才依 index 套用並推進 World。
 * 升級選擇走 PlayerInput.pick（chooseUpgrade），確保各端確定性一致。不呼叫時間/亂數。
 */
import type { World } from '../World'
import type { NetTransport, PlayerInput } from './types'

const NEUTRAL: PlayerInput = { move: { x: 0, y: 0 } }

export class LockstepRunner {
  /** 下一個待執行的 tick（自 0 單調遞增）。 */
  private currentTick = 0
  /** 下一個本地輸入要送到的 tick（自 inputDelay 起）。 */
  private nextSubmitTick: number

  constructor(
    private world: World,
    private transport: NetTransport,
    private inputDelay = 2,
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
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run src/engine/net/lockstep.test.ts`
Expected: PASS（5 筆）。

- [ ] **Step 5: 型別 + 全測試 + build**

Run: `npm run typecheck && npm test && npm run build`
Expected: 乾淨；既有測試全綠（未動既有檔）。

- [ ] **Step 6: Commit**

```bash
git add src/engine/net/lockstep.ts src/engine/net/lockstep.test.ts
git commit -m "$(printf '%s\n\n%s' '[mvp][feat][engine] LockstepRunner（inputDelay 緩衝 + 到齊推進 + pick 升級）+ 兩端同步測試' 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## 完成後
- [ ] `npm test` 全綠、`npm run build` 乾淨；更新 `acceptance.md` + `progress.md`（記錄 4B/4C 後續）。

---

## Self-Review（plan 對照 spec）
- **Spec coverage：** FR-1 型別→T1 S3；FR-2 NetTransport→T1 S3；FR-3 Loopback→T1 S4；FR-4 LockstepRunner→T2 S3；FR-5 確定性/順序→T2 測試（兩端同步 + 相同腳本一致）。Edge：缺輸入停滯、inputDelay、pick、初始窗皆有測試。
- **Placeholder scan：** 無 TBD；所有檔含完整碼與指令。
- **Type consistency：** `PlayerInput`/`TickInputs`/`NetTransport`/`LoopbackBus`/`LoopbackTransport`/`LockstepRunner`（`submitLocalInput`/`tryAdvance`/`getCurrentTick`/`checksum`）全程一致；消費 World `setMoveInput`/`chooseUpgrade`/`step`/`checksum`/`players`/`pendingOfferFor` 簽章一致。
