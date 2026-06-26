# elites-and-events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 替單局加入「精英怪（隨機詞綴、發光光環、掉寶箱）」與「週期性地圖事件（怪潮／精英來襲／包圍，含預警）」，提升遭遇變化與節奏起伏。

**Architecture:** 沿用既有 spawn/factory/chest/exploder 機制，最小新增——詞綴與事件為純資料表（`eliteDefs.ts`/`eventDefs.ts`）+ 純挑選函式（`events.ts`，比照 `spawn.ts`，走 seeded rng）；`World` 接上事件計時、精英套用與行為；呈現層只加精英光環與事件預警橫幅。不改升級/戰鬥/結算/勝負流程。

**Tech Stack:** TypeScript、PixiJS（Graphics 光環）、Vue 3（HUD 橫幅）、Vitest（引擎單元測試）。

## Global Constraints

- 文件/說明繁體中文（zh-TW）；程式碼/型別/commit 格式英文。
- 引擎（`src/engine/**`）純 TypeScript，執行期不得 import Vue/Pinia。
- 確定性：詞綴抽選、事件挑選、事件生怪一律走既有 seeded `this.rng`；模擬中不得呼叫 `Math.random()`。
- 固定步長 1/60，邏輯與 FPS 解耦。
- `spawnEnemyAt` 既有呼叫端不得破壞：新增的 `affix` 為**選填**第三參數，省略時行為與現況完全一致。
- commit 格式：`[mvp][type][scope] 描述`，結尾含 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。
- 定稿數值（不可改動）：
  - 詞綴：giant `hp×3.0/r×1.6/spd×0.8`、frenzy `spd×1.5/dmg×1.3`、regen `0.04/s`、volatile `死亡爆炸 半徑90/傷害18`。
  - 精英基線：在敵種基礎上額外 `hp×3`、`xp×5`，再套詞綴乘區。
  - 排程：`ELITE_MIN_TIME=60`、`ELITE_RANDOM_CHANCE=0.02`、`ELITE_PACK_COUNT=3`、`EVENT_INTERVAL=150`、`EVENT_WARNING_LEAD=5`、`SWARM_RUSH_COUNT=12`、`ENCIRCLE_COUNT=16`。

---

## 檔案結構（本案異動）

| 檔案 | 異動 | 責任 |
|------|------|------|
| `src/engine/types.ts` | Modify | `EliteAffix`、`GameEventKind`、`EliteAffixDef`、`GameEventDef`；`Entity.affix?` |
| `src/engine/systems/eliteDefs.ts` | Create | `ELITE_AFFIX_DEFS` + `ELITE_AFFIX_ORDER` |
| `src/engine/systems/eventDefs.ts` | Create | `GAME_EVENT_DEFS` + `GAME_EVENT_ORDER` |
| `src/engine/systems/events.ts` | Create | `pickEvent(rng)`、`pickAffix(rng)`（純函式） |
| `src/engine/World.ts` | Modify | `spawnEnemyAt` affix 套用、killEnemy 精英寶箱/爆裂、step regen/事件排程/隨機精英、summary.eventWarning、`triggerEvent` |
| `src/stores/game.ts` | Modify | `Summary.eventWarning?`、updateSummary/reset 接線 |
| `src/engine/sprites.ts` | Modify | `drawEnemy` 對 `e.affix` 加畫光環 |
| `src/ui/Hud.vue` | Modify | 事件預警橫幅 |
| `src/engine/systems/events.test.ts` | Create | pickEvent/pickAffix 確定性 |
| `src/engine/World.test.ts` | Modify | 精英套用/行為、事件排程/觸發測試 |

四個 task：Task 1 詞綴資料 + 精英套用；Task 2 精英行為（regen/爆裂/寶箱）；Task 3 事件系統 + 隨機精英 + summary；Task 4 呈現層（光環 + 預警橫幅）。

---

### Task 1: 詞綴資料 + 精英套用（spawnEnemyAt affix）

**Files:**
- Modify: `src/engine/types.ts`（新增型別 + `Entity.affix?`，約 line 27/59）
- Create: `src/engine/systems/eliteDefs.ts`
- Modify: `src/engine/World.ts`（`spawnEnemyAt` line 212-217）
- Test: `src/engine/World.test.ts`

**Interfaces:**
- Consumes：`createEnemy(pos, kind)` 回傳帶基礎 `hp/maxHp/radius/speed/damage/xp` 的 Entity；`World.mapEnemyHpMult`；`World.scaleEnemyHp(e)` 既有私有方法（套地圖倍率後 `maxHp=hp`）。
- Produces：`EliteAffix`、`EliteAffixDef`、`ELITE_AFFIX_DEFS`、`ELITE_AFFIX_ORDER`；`Entity.affix?`；`World.spawnEnemyAt(pos, kind?, affix?)`。

- [ ] **Step 1: 寫失敗測試（精英套用）**

在 `src/engine/World.test.ts`「省略地圖預設血管」測試之後新增：

```ts
  it('巨大化精英：hp×3×3、半徑×1.6、速度×0.8、xp×5', () => {
    const w = new World(1, 'macrophage', 'vessel')
    const e = w.spawnEnemyAt({ x: 100, y: 0 }, 'virus', 'giant')
    expect(e.affix).toBe('giant')
    expect(e.maxHp).toBeCloseTo(10 * 3 * 3.0, 5) // virus hp 10 × 精英3 × giant 3.0
    expect(e.radius).toBeCloseTo(12 * 1.6, 5)    // virus radius 12
    expect(e.speed).toBeCloseTo(60 * 0.8, 5)     // virus speed 60
    expect(e.xp).toBe(1 * 5)                       // virus xp 1 × 5
  })

  it('狂暴精英：速度×1.5、接觸傷害×1.3', () => {
    const w = new World(1)
    const e = w.spawnEnemyAt({ x: 100, y: 0 }, 'virus', 'frenzy')
    expect(e.speed).toBeCloseTo(60 * 1.5, 5)
    expect(e.damage).toBeCloseTo(5 * 1.3, 5) // virus damage 5
  })

  it('省略 affix 行為與現況一致（無精英）', () => {
    const w = new World(1)
    const e = w.spawnEnemyAt({ x: 100, y: 0 }, 'virus')
    expect(e.affix).toBeUndefined()
    expect(e.maxHp).toBe(10)
  })
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/engine/World.test.ts -t "精英"`
Expected: FAIL — 型別錯（`spawnEnemyAt` 不接受第三參數 / `EliteAffix` 未定義）。

- [ ] **Step 3: 新增型別（types.ts）**

在 `src/engine/types.ts` 的 `EnemyKind` 定義之後新增：

```ts
/** 精英詞綴；附加在敵人上強化其數值/行為。 */
export type EliteAffix = 'giant' | 'frenzy' | 'regen' | 'volatile'

/** 單個詞綴的定義（純資料）。 */
export interface EliteAffixDef {
  affix: EliteAffix
  name: string
  /** 光環顏色（呈現層用）。 */
  auraColor: number
  hpMult: number
  radiusMult: number
  speedMult: number
  damageMult: number
  /** 每秒回復 maxHp 的比例（regen 用，其餘為 0）。 */
  regenPerSec: number
  /** 死亡時是否觸發範圍爆炸（volatile 用）。 */
  explodeOnDeath: boolean
}
```

並在 `Entity` 介面內（`enemyKind?` 附近）新增欄位：

```ts
  /** 精英詞綴（僅精英敵人使用）；決定額外數值/行為與光環。 */
  affix?: EliteAffix
```

- [ ] **Step 4: 建立 eliteDefs.ts**

新增 `src/engine/systems/eliteDefs.ts`：

```ts
/**
 * 精英詞綴定義表（純資料）。每個詞綴的數值乘區、回血、死亡爆炸與光環色。
 * 新增詞綴或調數值都從這裡下手。
 */
import type { EliteAffix, EliteAffixDef } from '../types'

/** 確定性迭代/抽選用的固定順序。 */
export const ELITE_AFFIX_ORDER: EliteAffix[] = ['giant', 'frenzy', 'regen', 'volatile']

/** 全部詞綴定義表。 */
export const ELITE_AFFIX_DEFS: Record<EliteAffix, EliteAffixDef> = {
  giant: { affix: 'giant', name: '巨大化', auraColor: 0xff8a3d, hpMult: 3.0, radiusMult: 1.6, speedMult: 0.8, damageMult: 1.0, regenPerSec: 0, explodeOnDeath: false },
  frenzy: { affix: 'frenzy', name: '狂暴', auraColor: 0xff4d4d, hpMult: 1.0, radiusMult: 1.0, speedMult: 1.5, damageMult: 1.3, regenPerSec: 0, explodeOnDeath: false },
  regen: { affix: 'regen', name: '再生', auraColor: 0x5bff8c, hpMult: 1.0, radiusMult: 1.0, speedMult: 1.0, damageMult: 1.0, regenPerSec: 0.04, explodeOnDeath: false },
  volatile: { affix: 'volatile', name: '爆裂', auraColor: 0xffd54a, hpMult: 1.0, radiusMult: 1.0, speedMult: 1.0, damageMult: 1.0, regenPerSec: 0, explodeOnDeath: true },
}
```

- [ ] **Step 5: spawnEnemyAt 套用 affix（World.ts）**

在 `src/engine/World.ts` 頂部 import 區（`ENEMY_DEFS` import 那行附近）新增：

```ts
import { ELITE_AFFIX_DEFS } from './systems/eliteDefs'
```

並把 `spawnEnemyAt`（line 212-217）改為：

```ts
  /**
   * 在指定位置生成一隻敵人並加入場上；可選 affix 使其成為精英。
   * @param pos 生成位置。
   * @param kind 敵種。
   * @param affix 選填精英詞綴；提供時額外套 hp×3/xp×5 與詞綴乘區。
   * @returns 新建立的敵人 entity。
   */
  spawnEnemyAt(pos: Vec2, kind: EnemyKind = 'virus', affix?: EliteAffix): Entity {
    const e = createEnemy(pos, kind)
    this.scaleEnemyHp(e)
    if (affix) {
      const a = ELITE_AFFIX_DEFS[affix]
      e.affix = affix
      e.hp = e.maxHp = e.maxHp * 3 * a.hpMult
      e.radius *= a.radiusMult
      e.speed *= a.speedMult
      e.damage *= a.damageMult
      e.xp *= 5
    }
    this.enemies.push(e)
    return e
  }
```

並把 `World.ts` 的 types import 加上 `EliteAffix`（line 13 `import type { … } from './types'` 內補 `EliteAffix`）。

- [ ] **Step 6: 跑測試確認通過**

Run: `npx vitest run src/engine/World.test.ts -t "精英"`
Expected: PASS（3 筆）。

- [ ] **Step 7: 型別檢查 + 全測試**

Run: `npm run typecheck && npm test`
Expected: typecheck 無錯；全測試綠（既有 + 新增）。

- [ ] **Step 8: Commit**

```bash
git add src/engine/types.ts src/engine/systems/eliteDefs.ts src/engine/World.ts src/engine/World.test.ts
git commit -m "$(printf '%s\n\n%s' '[mvp][feat][engine] 精英詞綴資料 + spawnEnemyAt affix 套用（hp×3/xp×5 + 乘區）' 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 2: 精英行為（再生 / 爆裂 / 掉寶箱）

**Files:**
- Modify: `src/engine/World.ts`（`killEnemy` line 668-693、`step` 敵人 AI 迴圈 line 371-374）
- Test: `src/engine/World.test.ts`

**Interfaces:**
- Consumes：Task 1 的 `Entity.affix`、`ELITE_AFFIX_DEFS`；既有 `killEnemy(e)`、`createChest`、`distance`、`this.stats.armor`、`this.fxEventQueue`、`this.chestEntities`。
- Produces：精英死亡掉寶箱、volatile 死亡爆炸、regen 每幀回血。

- [ ] **Step 1: 寫失敗測試（精英行為）**

在 `src/engine/World.test.ts` 新增：

```ts
  it('精英死亡掉寶箱且經驗為基礎×5', () => {
    const w = new World(1)
    w.stats.pickupRadius = 0 // 避免寶石被吸走
    const e = w.spawnEnemyAt({ x: w.player.pos.x + 40, y: w.player.pos.y }, 'virus', 'frenzy')
    e.hp = 1
    w.forceFire()
    for (let i = 0; i < 20; i++) w.step(1 / 60)
    expect(e.active).toBe(false)
    expect(w.chests().length).toBeGreaterThan(0)
    expect(w.gems().some((g) => g.xp === 5)).toBe(true)
  })

  it('再生精英隨時間回血、不超過 maxHp', () => {
    const w = new World(1)
    const e = w.spawnEnemyAt({ x: 9999, y: 9999 }, 'spore', 'regen') // 遠離玩家不受傷
    e.hp = 1
    const before = e.hp
    for (let i = 0; i < 60; i++) w.step(1 / 60) // 1 秒
    expect(e.hp).toBeGreaterThan(before)
    expect(e.hp).toBeLessThanOrEqual(e.maxHp)
    e.hp = e.maxHp
    for (let i = 0; i < 60; i++) w.step(1 / 60)
    expect(e.hp).toBeCloseTo(e.maxHp, 5) // 滿血不溢出
  })

  it('爆裂精英死亡對近距玩家造成爆炸傷害', () => {
    const w = new World(1)
    const e = w.spawnEnemyAt({ x: w.player.pos.x, y: w.player.pos.y }, 'virus', 'volatile')
    const hpBefore = w.player.hp
    e.hp = 0
    w.step(1 / 60) // 觸發死亡結算
    expect(e.active).toBe(false)
    expect(w.player.hp).toBeLessThan(hpBefore)
  })
```

> 註：測試用到 `w.chests()`。若 World 尚無此 getter，於本 task Step 3 一併新增（比照既有 `gems()`）。

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/engine/World.test.ts -t "精英死亡掉寶箱|再生精英|爆裂精英"`
Expected: FAIL（無 chest getter / 無 regen / volatile 不爆炸）。

- [ ] **Step 3: 確保 chests() getter 存在（World.ts）**

確認 `src/engine/World.ts` 有對應 `chestEntities` 的公開 getter；若無，於 `gems()` 旁新增：

```ts
  /** @returns 場上所有寶箱（供 renderer/測試）。 */
  chests(): Entity[] {
    return this.chestEntities
  }
```

（若已存在同義 getter，沿用既有名稱並據此調整 Step 1 測試呼叫。）

- [ ] **Step 4: killEnemy 加精英寶箱與 volatile 爆炸（World.ts）**

把 `killEnemy`（line 668-693）的寶箱與爆炸段改為涵蓋精英。將：

```ts
    if (e.enemyKind === 'superbug') this.chestEntities.push(createChest(e.pos))
```

改為：

```ts
    if (e.enemyKind === 'superbug' || e.affix) this.chestEntities.push(createChest(e.pos))
```

並把死亡爆炸段（`if (def?.explode) { … }`）改為同時涵蓋 volatile 精英：

```ts
    // 死亡爆炸：exploder 敵種或 volatile 精英；玩家在半徑內扣血（套護甲）+ 推爆裂視覺。
    const explode = def?.explode ?? (e.affix === 'volatile' ? { radius: 90, damage: 18 } : undefined)
    if (explode) {
      const { radius, damage } = explode
      if (distance(e.pos, this.player.pos) <= radius) {
        this.player.hp -= Math.max(0, damage - this.stats.armor)
        this.soundEventQueue.push('hit')
      }
      this.fxEventQueue.push({ kind: 'nova', x: e.pos.x, y: e.pos.y, radius })
    }
```

- [ ] **Step 5: step 加 regen 回血（World.ts）**

在 `src/engine/World.ts` 的敵人 AI 迴圈（`for (const e of this.enemies) { if (!e.active) continue; steerEnemy(...) … }`，line 371 起）內、`steerEnemy` 之前加入：

```ts
      if (e.affix === 'regen') {
        e.hp = Math.min(e.maxHp, e.hp + e.maxHp * ELITE_AFFIX_DEFS.regen.regenPerSec * dt)
      }
```

- [ ] **Step 6: 跑測試確認通過**

Run: `npx vitest run src/engine/World.test.ts -t "精英死亡掉寶箱|再生精英|爆裂精英"`
Expected: PASS（3 筆）。

- [ ] **Step 7: 型別檢查 + 全測試**

Run: `npm run typecheck && npm test`
Expected: typecheck 無錯；全測試綠。

- [ ] **Step 8: Commit**

```bash
git add src/engine/World.ts src/engine/World.test.ts
git commit -m "$(printf '%s\n\n%s' '[mvp][feat][engine] 精英行為：再生回血 + 爆裂死亡爆炸 + 死亡掉寶箱' 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 3: 地圖事件系統 + 隨機精英 + 預警

**Files:**
- Modify: `src/engine/types.ts`（`GameEventKind`、`GameEventDef`）
- Create: `src/engine/systems/eventDefs.ts`
- Create: `src/engine/systems/events.ts`
- Create: `src/engine/systems/events.test.ts`
- Modify: `src/engine/World.ts`（step 事件排程 + 隨機精英、`triggerEvent`、summary、新欄位）
- Modify: `src/stores/game.ts`（`Summary.eventWarning?` + updateSummary/reset）
- Test: `src/engine/World.test.ts`

**Interfaces:**
- Consumes：Task 1 的 `EliteAffix`/`ELITE_AFFIX_ORDER`；既有 `pickEnemyKind`、`spawnPositionAround`、`SPAWN_RADIUS`、`this.rng`、`spawnEnemyAt(pos, kind, affix?)`。
- Produces：`GameEventKind`、`GameEventDef`、`GAME_EVENT_DEFS`、`GAME_EVENT_ORDER`、`pickEvent(rng)`、`pickAffix(rng)`、`World.triggerEvent(kind)`、`Summary.eventWarning?`。

- [ ] **Step 1: 寫失敗測試（events 純函式）**

新增 `src/engine/systems/events.test.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { createRng } from '../core/rng'
import { pickEvent, pickAffix } from './events'
import { GAME_EVENT_ORDER } from './eventDefs'
import { ELITE_AFFIX_ORDER } from './eliteDefs'

describe('events 純函式', () => {
  it('pickEvent 回傳合法事件且確定性（同 seed 同序列）', () => {
    const a = createRng(7), b = createRng(7)
    const seqA = [pickEvent(a), pickEvent(a), pickEvent(a)]
    const seqB = [pickEvent(b), pickEvent(b), pickEvent(b)]
    expect(seqA).toEqual(seqB)
    expect(seqA.every((k) => GAME_EVENT_ORDER.includes(k))).toBe(true)
  })
  it('pickAffix 回傳合法詞綴且確定性', () => {
    const a = createRng(3), b = createRng(3)
    expect(pickAffix(a)).toBe(pickAffix(b))
    expect(ELITE_AFFIX_ORDER.includes(pickAffix(createRng(9)))).toBe(true)
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/engine/systems/events.test.ts`
Expected: FAIL — 模組不存在。

- [ ] **Step 3: 新增型別（types.ts）**

在 `src/engine/types.ts` 的 `EliteAffixDef` 之後新增：

```ts
/** 地圖事件種類。 */
export type GameEventKind = 'swarm-rush' | 'elite-pack' | 'encircle'

/** 單個地圖事件的定義（純資料）。 */
export interface GameEventDef {
  kind: GameEventKind
  name: string
  /** 觸發前 HUD 顯示的預警字串。 */
  warning: string
}
```

- [ ] **Step 4: 建立 eventDefs.ts**

新增 `src/engine/systems/eventDefs.ts`：

```ts
/**
 * 地圖事件定義表（純資料）。每個事件的名稱與預警字串。
 */
import type { GameEventKind, GameEventDef } from '../types'

/** 確定性迭代/抽選用的固定順序。 */
export const GAME_EVENT_ORDER: GameEventKind[] = ['swarm-rush', 'elite-pack', 'encircle']

/** 全部事件定義表。 */
export const GAME_EVENT_DEFS: Record<GameEventKind, GameEventDef> = {
  'swarm-rush': { kind: 'swarm-rush', name: '怪潮', warning: '警告：怪潮來襲' },
  'elite-pack': { kind: 'elite-pack', name: '精英來襲', warning: '警告：精英來襲' },
  'encircle': { kind: 'encircle', name: '包圍', warning: '警告：四面包圍' },
}
```

- [ ] **Step 5: 建立 events.ts（純函式）**

新增 `src/engine/systems/events.ts`：

```ts
/**
 * 地圖事件與精英詞綴的挑選（純函式，比照 spawn.ts）。
 * 為維持確定性，亂數一律走傳入的 seeded rng，不可使用 Math.random。
 */
import type { Rng } from '../core/rng'
import type { GameEventKind, EliteAffix } from '../types'
import { GAME_EVENT_ORDER } from './eventDefs'
import { ELITE_AFFIX_ORDER } from './eliteDefs'

/** 等機率挑一個地圖事件。 */
export function pickEvent(rng: Rng): GameEventKind {
  const i = Math.floor(rng.next() * GAME_EVENT_ORDER.length)
  return GAME_EVENT_ORDER[Math.min(i, GAME_EVENT_ORDER.length - 1)]
}

/** 等機率挑一個精英詞綴。 */
export function pickAffix(rng: Rng): EliteAffix {
  const i = Math.floor(rng.next() * ELITE_AFFIX_ORDER.length)
  return ELITE_AFFIX_ORDER[Math.min(i, ELITE_AFFIX_ORDER.length - 1)]
}
```

- [ ] **Step 6: 跑 events 測試確認通過**

Run: `npx vitest run src/engine/systems/events.test.ts`
Expected: PASS（2 筆）。

- [ ] **Step 7: 寫失敗測試（World 事件排程 + 隨機精英）**

在 `src/engine/World.test.ts` 新增：

```ts
  it('triggerEvent elite-pack 一次生成 3 隻精英', () => {
    const w = new World(1)
    const before = w.enemies.length
    w.triggerEvent('elite-pack')
    const added = w.enemies.slice(before)
    expect(added.length).toBe(3)
    expect(added.every((e) => e.affix !== undefined)).toBe(true)
  })

  it('triggerEvent encircle 整圈生成多隻', () => {
    const w = new World(1)
    const before = w.enemies.length
    w.triggerEvent('encircle')
    expect(w.enemies.length - before).toBe(16)
  })

  it('事件於 150 秒觸發、前 5 秒預警，開始後清空', () => {
    const w = new World(1)
    for (let i = 0; i < 146 * 60; i++) w.step(1 / 60) // 146 秒：已進預警窗
    expect(w.summary().eventWarning).toBeTruthy()
    for (let i = 0; i < 6 * 60; i++) w.step(1 / 60) // 越過 150 秒
    expect(w.summary().eventWarning).toBeFalsy()
  })
```

- [ ] **Step 8: 跑測試確認失敗**

Run: `npx vitest run src/engine/World.test.ts -t "triggerEvent|事件於 150"`
Expected: FAIL — `triggerEvent` 不存在 / summary 無 eventWarning。

- [ ] **Step 9: World 接線（types import、欄位、常數、step、triggerEvent、summary）**

`src/engine/World.ts`：

1) 頂部 import 區新增：

```ts
import { pickEvent, pickAffix } from './systems/events'
import { GAME_EVENT_DEFS } from './systems/eventDefs'
```

並把 types import 補上 `GameEventKind`。

2) 在 `BOSS_INTERVAL` 常數附近新增模組常數：

```ts
/** 地圖事件週期（秒）與觸發前預警時間（秒）。 */
const EVENT_INTERVAL = 150
const EVENT_WARNING_LEAD = 5
/** 隨機精英：開局多少秒後啟用，以及每次一般生怪變精英的機率。 */
const ELITE_MIN_TIME = 60
const ELITE_RANDOM_CHANCE = 0.02
/** 事件生怪數量。 */
const ELITE_PACK_COUNT = 3
const SWARM_RUSH_COUNT = 12
const ENCIRCLE_COUNT = 16
```

3) 在 class 欄位區（`bossTimer`/`bossCount` 附近）新增：

```ts
  /** 地圖事件倒數（秒）。 */
  private eventTimer = EVENT_INTERVAL
  /** 已挑定、預警中即將觸發的事件（在預警窗鎖定，確保預警文字與觸發事件一致）。 */
  private pendingEvent?: GameEventKind
  /** 目前 HUD 預警字串（無則 undefined）。 */
  private eventWarning?: string
```

4) 在 `step` 的常態生怪區塊（line 354-360），把 else 分支改為可隨機變精英：

```ts
    this.spawnTimer -= dt
    if (this.spawnTimer <= 0) {
      this.spawnTimer = spawnInterval(this.elapsed) * this.mapSpawnIntervalMult
      const pos = spawnPositionAround(this.player.pos, SPAWN_RADIUS, this.rng.next())
      const kind = pickEnemyKind(this.elapsed, this.rng)
      if (kind === 'bacteria') this.spawnSwarmAt(pos)
      else {
        const affix = (this.elapsed >= ELITE_MIN_TIME && this.rng.next() < ELITE_RANDOM_CHANCE)
          ? pickAffix(this.rng) : undefined
        this.spawnEnemyAt(pos, kind, affix)
      }
    }
```

5) 在 Boss 計時區塊（line 362-368）之後新增事件排程：

```ts
    // 2c) 地圖事件：到預警窗鎖定事件並顯示警告；倒數歸零時觸發、重置計時。
    this.eventTimer -= dt
    if (this.eventTimer <= EVENT_WARNING_LEAD && this.eventTimer > 0) {
      if (!this.pendingEvent) this.pendingEvent = pickEvent(this.rng)
      this.eventWarning = GAME_EVENT_DEFS[this.pendingEvent].warning
    }
    if (this.eventTimer <= 0) {
      const kind = this.pendingEvent ?? pickEvent(this.rng)
      this.triggerEvent(kind)
      this.pendingEvent = undefined
      this.eventWarning = undefined
      this.eventTimer = EVENT_INTERVAL
    }
```

6) 新增 `triggerEvent` 公開方法（放在 `spawnBossAt` 之後）：

```ts
  /**
   * 觸發一個地圖事件：依種類生成對應的一波敵人（全走 seeded rng）。
   * @param kind 事件種類。
   */
  triggerEvent(kind: GameEventKind): void {
    if (kind === 'swarm-rush') {
      const baseT = this.rng.next()
      for (let i = 0; i < SWARM_RUSH_COUNT; i++) {
        const t = baseT + (i - SWARM_RUSH_COUNT / 2) * 0.02
        this.spawnEnemyAt(spawnPositionAround(this.player.pos, SPAWN_RADIUS, t), 'virus')
      }
    } else if (kind === 'elite-pack') {
      for (let i = 0; i < ELITE_PACK_COUNT; i++) {
        const pos = spawnPositionAround(this.player.pos, SPAWN_RADIUS, this.rng.next())
        this.spawnEnemyAt(pos, pickEnemyKind(this.elapsed, this.rng), pickAffix(this.rng))
      }
    } else {
      for (let i = 0; i < ENCIRCLE_COUNT; i++) {
        const pos = spawnPositionAround(this.player.pos, SPAWN_RADIUS, i / ENCIRCLE_COUNT)
        this.spawnEnemyAt(pos, pickEnemyKind(this.elapsed, this.rng))
      }
    }
  }
```

7) 在 `summary()` 回傳物件加入 `eventWarning`：

```ts
      bossMaxHp: boss ? boss.maxHp : 0,
      eventWarning: this.eventWarning,
```

- [ ] **Step 10: store 接線（game.ts）**

`src/stores/game.ts`：在 `Summary` 介面 `bossMaxHp` 之後新增：

```ts
  /** 目前地圖事件預警字串（無則 undefined）；HUD 顯示橫幅用。 */
  eventWarning?: string
```

在 `updateSummary` 末端新增：

```ts
      this.eventWarning = s.eventWarning
```

在 `reset`（清場那段，設 `loadout = …` 附近）新增：

```ts
      this.eventWarning = undefined
```

- [ ] **Step 11: 跑測試確認通過**

Run: `npx vitest run src/engine/systems/events.test.ts src/engine/World.test.ts -t "triggerEvent|事件於 150|events 純函式"`
Expected: PASS。

- [ ] **Step 12: 型別檢查 + 全測試**

Run: `npm run typecheck && npm test`
Expected: typecheck 無錯；全測試綠。

- [ ] **Step 13: Commit**

```bash
git add src/engine/types.ts src/engine/systems/eventDefs.ts src/engine/systems/events.ts src/engine/systems/events.test.ts src/engine/World.ts src/engine/World.test.ts src/stores/game.ts
git commit -m "$(printf '%s\n\n%s' '[mvp][feat][engine] 地圖事件系統（150s 週期 + 5s 預警 + 三事件）+ 隨機精英混入 + summary.eventWarning' 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 4: 呈現層（精英光環 + 事件預警橫幅）

**Files:**
- Modify: `src/engine/sprites.ts`（`drawEnemy`）
- Modify: `src/ui/Hud.vue`
- 驗證：`npm run typecheck` + `npm run build` + 實機目視（呈現層不寫單元測試）。

**Interfaces:**
- Consumes：Task 1 的 `Entity.affix`、`ELITE_AFFIX_DEFS[affix].auraColor`；Task 3 的 `store.eventWarning`。

- [ ] **Step 1: drawEnemy 加精英光環（sprites.ts）**

在 `src/engine/sprites.ts` 頂部 import 區加入：

```ts
import { ELITE_AFFIX_DEFS } from './systems/eliteDefs'
```

在 `drawEnemy(g, e)` 函式**開頭**（畫敵人造型之前）加入光環：

```ts
  if (e.affix) {
    const aura = ELITE_AFFIX_DEFS[e.affix].auraColor
    g.circle(0, 0, e.radius * 1.45).fill({ color: aura, alpha: 0.18 })
    g.circle(0, 0, e.radius * 1.2).stroke({ width: 3, color: aura, alpha: 0.9 })
  }
```

> 註：drawEnemy 在 sprite 首次建立時呼叫一次（此時 `e.affix` 已於 `spawnEnemyAt` 設好），靜態繪製即可，無需每幀更新。

- [ ] **Step 2: 型別檢查**

Run: `npm run typecheck`
Expected: 無錯。

- [ ] **Step 3: HUD 事件預警橫幅（Hud.vue）**

在 `src/ui/Hud.vue` 的 `<template>` 內、HUD 頂部適當位置（如時間/血條附近）加入預警橫幅，僅當 `store.eventWarning` 存在時顯示：

```vue
    <div v-if="store.eventWarning" class="event-warning">{{ store.eventWarning }}</div>
```

並在 `<style scoped>` 加入樣式（沿用既有設計 token / 警示色）：

```css
.event-warning {
  position: absolute;
  top: 3.2rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.3rem 1rem;
  font-family: var(--font-display, sans-serif);
  letter-spacing: 0.08em;
  color: #ffd54a;
  background: rgba(20, 6, 6, 0.6);
  border: 1px solid rgba(255, 213, 74, 0.6);
  border-radius: 6px;
  pointer-events: none;
  animation: warn-pulse 0.8s ease-in-out infinite alternate;
}
@keyframes warn-pulse { from { opacity: 0.6; } to { opacity: 1; } }
```

> 若 `Hud.vue` 透過 `const store = useGameStore()` 取得 store，直接用 `store.eventWarning`；若以 props/computed 包裝 summary，沿用既有方式新增一個 `eventWarning` computed。確認 `Hud.vue` 既有 store 取用方式後對齊。

- [ ] **Step 4: 型別檢查 + build**

Run: `npm run typecheck && npm run build`
Expected: 皆乾淨。

- [ ] **Step 5: Commit**

```bash
git add src/engine/sprites.ts src/ui/Hud.vue
git commit -m "$(printf '%s\n\n%s' '[mvp][feat][ui] 精英光環 + 事件預警橫幅（呈現層）' 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## 實機驗證（四 task 完成後）

依 `acceptance.md`「呈現層」與「驗證快照」：
- [ ] `npm run dev`：玩到出現精英（帶色光環，明顯區隔），確認 hp 厚、死亡掉寶箱。
- [ ] 撐到約 2:25 看到事件預警橫幅，2:30 出現對應一波（怪潮/精英來襲/包圍）。
- [ ] 觀察 regen 精英回血、volatile 精英死亡爆炸。
- [ ] `npm run build` 乾淨；更新 `acceptance.md` 勾選 + `progress.md`。

---

## Self-Review（plan 對照 spec）

- **Spec coverage：** FR-1 詞綴定義→T1 S3-4；FR-2 精英套用→T1 S5；FR-3 行為（regen/volatile/寶箱）→T2；FR-4 隨機混入→T3 S9.4；FR-5 事件→T3（defs/events/排程/triggerEvent）；FR-6 呈現（光環/橫幅）→T4。Edge cases：省略 affix（T1 S1 測試）、swarm 不精英（T3 spawn 只在 else 分支套精英）、暫停凍結（計時走 step、不 step 即凍結）、再生不溢出（Math.min，T2 測試）、爆裂一次（killEnemy 一次性）。
- **Placeholder scan：** 無 TBD；每改碼步驟含完整程式碼與確切路徑/指令。少數「確認既有 getter/ store 取用方式」為對齊既有碼的查核點，非占位——已給後備新增碼。
- **Type consistency：** 全程一致使用 `EliteAffix`、`GameEventKind`、`ELITE_AFFIX_DEFS`、`GAME_EVENT_DEFS`、`pickEvent`/`pickAffix`、`spawnEnemyAt(pos, kind?, affix?)`、`triggerEvent(kind)`、`Summary.eventWarning`、`Entity.affix`；數值與 Global Constraints 一致。
