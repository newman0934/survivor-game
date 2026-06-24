# 升級彈窗顯示持有（loadout-display）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在升級三選一彈窗上方顯示玩家持有的武器/被動（含等級）與每把武器的進化提示。

**Architecture:** 引擎於提供升級選項時推一份純資料「持有快照」（`World.loadoutSnapshot`）給 store；進化狀態以純函式 `evolutionStatus` 判定；UpgradeModal 讀 `store.loadout` 並用 `WEAPON_DEFS`/`PASSIVE_DEFS` 純資料解析名稱與進化條件呈現。

**Tech Stack:** TypeScript 純引擎、Pinia 橋接、Vue 3 `<script setup>`、Vitest。

## Global Constraints

- 繁體中文（zh-TW）：所有註解、UI 文案；程式碼/型別名稱英文。
- 引擎純度：`src/engine/**` 不引入 Vue/Pinia 執行期依賴；`loadoutSnapshot`/`evolutionStatus` 為純函式、無 `Math.random()`。
- 不修改 `Summary` 形狀、既有 store 欄位、武器/被動數值/行為；既有形狀只新增不修改。
- `evolutionStatus` 判定須與 `leveling.buildCandidates` 進化條件一致（滿級 + 持有 `evolution.requires` 被動）。
- 既有 168 單元測試維持全綠。
- Commit 格式：`[mvp][type][scope] 描述` + `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。

---

### Task 1: `evolutionStatus` 純函式（TDD）

**Files:**
- Create: `src/engine/systems/loadout.ts`
- Test: `src/engine/systems/loadout.test.ts`

**Interfaces:**
- Consumes: `WEAPON_DEFS`（`./weaponDefs`）、`WeaponKind`/`PassiveKind`（`../types`）。
- Produces: `type EvolutionStatus = 'evolved' | 'ready' | 'pending'`；`function evolutionStatus(weapon: { kind: WeaponKind; level: number; evolved?: boolean }, ownedPassives: PassiveKind[]): EvolutionStatus`。

- [ ] **Step 1: 寫失敗測試 `src/engine/systems/loadout.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { evolutionStatus } from './loadout'

describe('evolutionStatus', () => {
  it('已進化 → evolved', () => {
    expect(evolutionStatus({ kind: 'antibody', level: 5, evolved: true }, ['tome'])).toBe('evolved')
  })
  it('滿級 + 持有所需被動 → ready', () => {
    expect(evolutionStatus({ kind: 'antibody', level: 5 }, ['tome'])).toBe('ready')
  })
  it('滿級但缺所需被動 → pending', () => {
    expect(evolutionStatus({ kind: 'antibody', level: 5 }, ['heart'])).toBe('pending')
  })
  it('未滿級 → pending（即使持有被動）', () => {
    expect(evolutionStatus({ kind: 'antibody', level: 3 }, ['tome'])).toBe('pending')
  })
})
```

- [ ] **Step 2: 執行確認失敗**

Run: `npx vitest run src/engine/systems/loadout.test.ts`
Expected: FAIL（`Cannot find module './loadout'`）

- [ ] **Step 3: 實作 `src/engine/systems/loadout.ts`**

```ts
/**
 * 持有/進化狀態 system（純函式）。
 *
 * 提供 UI 顯示「目前持有」與進化提示所需的純邏輯：判定某武器的進化狀態。
 * 判定條件與 leveling.buildCandidates 一致（滿級 + 持有指定被動）。純 TS、無 Vue/Pinia。
 */
import type { WeaponKind, PassiveKind } from '../types'
import { WEAPON_DEFS } from './weaponDefs'

/** 武器進化狀態：已進化 / 可進化 / 尚未滿足。 */
export type EvolutionStatus = 'evolved' | 'ready' | 'pending'

/**
 * 判定一把武器的進化狀態。
 * @param weapon        武器（kind/level/evolved）。
 * @param ownedPassives 玩家持有的被動種類清單。
 * @returns 'evolved'（已進化）/ 'ready'（滿級且持有所需被動）/ 'pending'（其餘）。
 */
export function evolutionStatus(
  weapon: { kind: WeaponKind; level: number; evolved?: boolean },
  ownedPassives: PassiveKind[],
): EvolutionStatus {
  if (weapon.evolved) return 'evolved'
  const def = WEAPON_DEFS[weapon.kind]
  const evo = def.evolution
  if (!evo) return 'pending'
  const maxed = weapon.level >= def.maxLevel
  return maxed && ownedPassives.includes(evo.requires) ? 'ready' : 'pending'
}
```

- [ ] **Step 4: 執行確認通過 + 型別檢查**

Run: `npx vitest run src/engine/systems/loadout.test.ts`
Expected: PASS（4 tests）

Run: `npm run typecheck`
Expected: 乾淨

- [ ] **Step 5: Commit**

```bash
git add src/engine/systems/loadout.ts src/engine/systems/loadout.test.ts
git commit -m "[mvp][feat][engine] evolutionStatus 純函式：判定武器進化狀態（TDD）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: 持有快照資料管線（store + World + Game）

**Files:**
- Modify: `src/stores/game.ts`
- Modify: `src/engine/World.ts`
- Modify: `src/engine/Game.ts`
- Test: `src/engine/World.test.ts`

**Interfaces:**
- Consumes: 無（Task 1 與本 task 獨立）。
- Produces:
  - `interface LoadoutSnapshot { weapons: { kind: WeaponKind; level: number; evolved: boolean }[]; passives: { kind: PassiveKind; level: number }[] }`（定義於 `stores/game.ts`）
  - `store.loadout: LoadoutSnapshot`、`store.setLoadout(l: LoadoutSnapshot)`
  - `World.loadoutSnapshot(): LoadoutSnapshot`

- [ ] **Step 1: 改 `src/stores/game.ts` — LoadoutSnapshot 型別 + loadout 狀態 + setLoadout**

在檔頭 `import { defineStore } from 'pinia'` 之後新增 type-only import：

```ts
import type { WeaponKind, PassiveKind } from '../engine/types'
```

在 `Summary` 介面之後新增：

```ts
/** 玩家目前持有的武器與被動快照（升級彈窗顯示用，純資料）。 */
export interface LoadoutSnapshot {
  weapons: { kind: WeaponKind; level: number; evolved: boolean }[]
  passives: { kind: PassiveKind; level: number }[]
}
```

在 `interface State` 內（`onUpgradePicked` 之後）新增：

```ts
  /** 目前持有的武器/被動快照；升級彈窗開啟時更新。 */
  loadout: LoadoutSnapshot
```

在 `state: (): State => ({ ... })` 內（`onUpgradePicked: null,` 之後）新增：

```ts
    loadout: { weapons: [], passives: [] },
```

在 `start()` action 內（`this.onUpgradePicked = null` 之後）新增重置：

```ts
      this.loadout = { weapons: [], passives: [] }
```

在 actions 內新增 `setLoadout`（放在 `offerUpgrades` 之前）：

```ts
    /** 引擎 → store：更新目前持有快照（升級彈窗顯示用）。 */
    setLoadout(l: LoadoutSnapshot) {
      this.loadout = l
    },
```

- [ ] **Step 2: 改 `src/engine/World.ts` — loadoutSnapshot()**

把既有 type-only import：

```ts
import type { Summary } from '../stores/game'
```

改為：

```ts
import type { Summary, LoadoutSnapshot } from '../stores/game'
```

在 `summary()` 方法之前（或之後）新增：

```ts
  /**
   * 產生目前持有的武器/被動快照（純資料），供升級彈窗顯示。
   * @returns weapons（kind/level/evolved）與 passives（kind/level）的快照。
   */
  loadoutSnapshot(): LoadoutSnapshot {
    return {
      weapons: this.weapons.map((w) => ({ kind: w.kind, level: w.level, evolved: !!w.evolved })),
      passives: this.passives.map((p) => ({ kind: p.kind, level: p.level })),
    }
  }
```

- [ ] **Step 3: 改 `src/engine/Game.ts` — 提供升級選項時推快照**

在升級握手區塊，把：

```ts
        if (this.world.consumeLevelUp()) {
          const opts = rollUpgrades(this.upgradeRng, 3, this.world.upgradeContext())
          this.store.offerUpgrades(opts.map((o) => ({ id: o.id, label: o.label })))
```

改為（在 offerUpgrades 前推快照）：

```ts
        if (this.world.consumeLevelUp()) {
          const opts = rollUpgrades(this.upgradeRng, 3, this.world.upgradeContext())
          this.store.setLoadout(this.world.loadoutSnapshot())
          this.store.offerUpgrades(opts.map((o) => ({ id: o.id, label: o.label })))
```

- [ ] **Step 4: 寫 World.loadoutSnapshot 測試（加到 `src/engine/World.test.ts`）**

```ts
  it('loadoutSnapshot 反映目前武器與被動（含 evolved）', () => {
    const w = new World(1)
    const ab = w.weapons.find((x) => x.kind === 'antibody')!
    ab.level = 5
    ab.evolved = true
    w.passives.push({ kind: 'tome', level: 2 })
    const snap = w.loadoutSnapshot()
    expect(snap.weapons).toContainEqual({ kind: 'antibody', level: 5, evolved: true })
    expect(snap.passives).toContainEqual({ kind: 'tome', level: 2 })
  })
```

- [ ] **Step 5: 執行測試 + 型別檢查**

Run: `npx vitest run src/engine/World.test.ts`
Expected: PASS（既有 + 新 1）

Run: `npm run typecheck`
Expected: 乾淨

- [ ] **Step 6: Commit**

```bash
git add src/stores/game.ts src/engine/World.ts src/engine/Game.ts src/engine/World.test.ts
git commit -m "[mvp][feat][engine] 持有快照管線：World.loadoutSnapshot + store.loadout + Game 接線

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: UpgradeModal 持有區 + 驗證 + 進度更新

**Files:**
- Modify: `src/ui/UpgradeModal.vue`
- Modify: `progress.md`
- Modify: `docs/superpowers/specs/loadout-display/acceptance.md`

**Interfaces:**
- Consumes: `store.loadout`（Task 2）、`evolutionStatus`（Task 1）、`WEAPON_DEFS`/`PASSIVE_DEFS`、`LoadoutSnapshot` 型別。
- Produces: 無下游（最終任務）。

- [ ] **Step 1: 改 `src/ui/UpgradeModal.vue` `<script setup>`**

把現有 script：

```ts
import { useGameStore } from '../stores/game'
const store = useGameStore()
```

改為：

```ts
import { computed } from 'vue'
import { useGameStore, type LoadoutSnapshot } from '../stores/game'
import { WEAPON_DEFS } from '../engine/systems/weaponDefs'
import { PASSIVE_DEFS } from '../engine/systems/passiveDefs'
import { evolutionStatus } from '../engine/systems/loadout'

const store = useGameStore()

type WeaponItem = LoadoutSnapshot['weapons'][number]
type PassiveItem = LoadoutSnapshot['passives'][number]

/** 目前持有的被動種類（供進化判定）。 */
const ownedPassiveKinds = computed(() => store.loadout.passives.map((p) => p.kind))

/** 武器顯示名（已進化顯示進化名）。 */
function weaponName(w: WeaponItem): string {
  return w.evolved ? WEAPON_DEFS[w.kind].evolution!.label : WEAPON_DEFS[w.kind].label
}
/** 武器等級顯示（滿級 MAX）。 */
function weaponLevel(w: WeaponItem): string {
  return w.level >= WEAPON_DEFS[w.kind].maxLevel ? 'MAX' : 'Lv' + w.level
}
/** 武器進化提示文字 + 樣式類別。 */
function weaponHint(w: WeaponItem): { text: string; cls: string } {
  const s = evolutionStatus(w, ownedPassiveKinds.value)
  if (s === 'evolved') return { text: '★ 已進化', cls: 'evolved' }
  if (s === 'ready') return { text: '可進化！', cls: 'ready' }
  const req = WEAPON_DEFS[w.kind].evolution!.requires
  return { text: '進化需：滿級＋' + PASSIVE_DEFS[req].label, cls: 'pending' }
}
/** 被動顯示名與等級。 */
function passiveName(p: PassiveItem): string {
  return PASSIVE_DEFS[p.kind].label
}
function passiveLevel(p: PassiveItem): string {
  return p.level >= PASSIVE_DEFS[p.kind].maxLevel ? 'MAX' : 'Lv' + p.level
}
```

- [ ] **Step 2: 改 `src/ui/UpgradeModal.vue` template — 卡片上方加持有區**

把 template 改為（在 `.cards` 之前插入持有區）：

```vue
<template>
  <div class="overlay">
    <h2 class="title">選擇升級</h2>
    <div class="loadout" v-if="store.loadout.weapons.length || store.loadout.passives.length">
      <div class="ld-col" v-if="store.loadout.weapons.length">
        <div class="ld-title">武器</div>
        <div v-for="w in store.loadout.weapons" :key="w.kind" class="ld-item">
          <span class="ld-name">{{ weaponName(w) }} {{ weaponLevel(w) }}</span>
          <span class="ld-hint" :class="weaponHint(w).cls">{{ weaponHint(w).text }}</span>
        </div>
      </div>
      <div class="ld-col" v-if="store.loadout.passives.length">
        <div class="ld-title">被動</div>
        <div v-for="p in store.loadout.passives" :key="p.kind" class="ld-item">
          <span class="ld-name">{{ passiveName(p) }} {{ passiveLevel(p) }}</span>
        </div>
      </div>
    </div>
    <div class="cards">
      <!-- 逐一渲染引擎提供的升級選項；點擊送出該升級 id 並恢復遊戲 -->
      <button v-for="(opt, i) in store.upgradeOptions" :key="opt.id" class="card"
        :class="{ evolve: opt.id.startsWith('evolve:') }"
        :style="{ animationDelay: 0.06 * i + 's' }"
        @click="store.pickUpgrade(opt.id)">
        {{ opt.label }}
      </button>
    </div>
  </div>
</template>
```

- [ ] **Step 3: 改 `src/ui/UpgradeModal.vue` `<style scoped>` — 持有區樣式**

在 `<style scoped>` 既有規則後新增：

```css
.loadout { display: flex; gap: 2rem; flex-wrap: wrap; justify-content: center; max-width: 92vw;
  font-size: 0.82rem; color: #fff; opacity: 0.95; }
.ld-col { display: flex; flex-direction: column; gap: 0.2rem; min-width: 9rem; }
.ld-title { font-size: 0.78rem; opacity: 0.6; letter-spacing: 0.15em; margin-bottom: 0.15rem; }
.ld-item { display: flex; justify-content: space-between; gap: 0.6rem; }
.ld-name { white-space: nowrap; }
.ld-hint { white-space: nowrap; opacity: 0.85; }
.ld-hint.ready { color: var(--immune-accent-strong); font-weight: bold; opacity: 1; }
.ld-hint.evolved { color: var(--antigen); font-weight: bold; opacity: 1; }
.ld-hint.pending { opacity: 0.55; }
@media (max-width: 600px) {
  .loadout { gap: 1rem; font-size: 0.74rem; max-height: 38vh; overflow-y: auto; }
  .ld-col { min-width: 7.5rem; }
}
```

- [ ] **Step 4: 型別檢查 + 測試 + build**

Run: `npm run typecheck`
Expected: 乾淨

Run: `npm test`
Expected: PASS（既有 168 + Task1 4 + Task2 1 = 173）

Run: `npm run build`
Expected: 乾淨

- [ ] **Step 5: 實機驗證**

Run: `npm run dev`，於瀏覽器：
1. 玩到升級 → 彈窗上方出現「武器 / 被動」持有區，各列名稱 + 等級（滿級顯示 MAX）。
2. 把某武器升滿但未持有對應被動 → 該武器顯示「進化需：滿級＋○○」。
3. 取得對應被動後再升級 → 該武器顯示「可進化！」；選進化卡後顯示進化名 + 「★ 已進化」。
4. 窄螢幕（縮視窗）持有區不破版（可捲動）。
5. console 無功能相關錯誤。

- [ ] **Step 6: 更新 acceptance.md 與 progress.md**

勾選 `docs/superpowers/specs/loadout-display/acceptance.md` 各項並填驗證日期 2026-06-24（「實機驗證」項保持未勾、標註待玩家）；
在 `progress.md` 階段 2 武器/被動相關處補一行「升級彈窗顯示目前持有武器/被動 + 進化提示 → specs/loadout-display/」，並更新測試數（168→173）。

- [ ] **Step 7: Commit**

```bash
git add src/ui/UpgradeModal.vue progress.md docs/superpowers/specs/loadout-display/acceptance.md
git commit -m "[mvp][feat][ui] 升級彈窗顯示持有武器/被動 + 進化提示；驗收/進度更新

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review（plan 對 spec 的覆蓋檢查）

- **FR-1 持有快照**：Task 2 `World.loadoutSnapshot` + type-only import `LoadoutSnapshot`。✅
- **FR-2 store 欄位**：Task 2 `LoadoutSnapshot`/`loadout`/`setLoadout`/start 重置。✅
- **FR-3 接線**：Task 2 Game 在 offerUpgrades 前 setLoadout（同一握手覆蓋寶箱）。✅
- **FR-4 evolutionStatus**：Task 1 純函式，與 buildCandidates 條件一致（滿級 + 持有 requires）。✅
- **FR-5 UI**：Task 3 持有區、武器名/等級/進化提示三態、被動名/等級、主題/RWD。✅
- **Edge Cases**：空欄不顯示標題（v-if length）；全滿級缺被動顯示 pending；已進化顯示進化名 + ★。✅
- **不變項**：不改 Summary/既有 store 欄位/數值；168 測試於 Task 3 Step 4 驗證；純函式無 Math.random。✅
- **型別一致性**：`LoadoutSnapshot`/`loadout`/`setLoadout`/`loadoutSnapshot`/`evolutionStatus`/`EvolutionStatus` 跨 task 一致。✅
- **Placeholder 掃描**：無 TBD；每步含完整程式碼。✅
