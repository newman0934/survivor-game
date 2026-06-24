# Spec — 升級彈窗顯示目前持有（武器/被動 + 進化提示）

## Overview

在升級三選一彈窗上方新增「目前持有」區，列出玩家持有的武器與被動（含等級），並對每把武器
標示**進化提示**（已進化 / 可進化 / 進化需：滿級＋某被動）。直接解決「玩家看不到進化需要什麼、
盲選導致卡死」的體驗缺陷。

依專案分層：引擎於提供升級選項時推一份純資料「持有快照」給 store；名稱與進化條件由 UI 端以
`WEAPON_DEFS`/`PASSIVE_DEFS` 純資料 import 解析（同 MainMenu 既有用法），不污染引擎/store。

## Business Requirements

- 讓玩家在每次升級時看到自己的 build 與「差什麼才能進化」，避免盲選與後期卡死只剩補血卡。
- 重用既有升級握手時機，零新畫面、手機友善。

## Functional Requirements

### FR-1 持有快照（引擎 → store）
- `World` 新增 `loadoutSnapshot(): LoadoutSnapshot`，回傳純資料：
  ```ts
  interface LoadoutSnapshot {
    weapons: { kind: WeaponKind; level: number; evolved: boolean }[]
    passives: { kind: PassiveKind; level: number }[]
  }
  ```
  `weapons` 取自 `World.weapons`（`evolved` 缺省視為 false）、`passives` 取自 `World.passives`，順序即持有順序。
- `LoadoutSnapshot` 型別定義於 `src/stores/game.ts`（與 `Summary` 同為橋接型別）；`World` 以 type-only import 取用（同既有 `import type { Summary }`）。

### FR-2 store 持有欄位
- store 新增 `loadout: LoadoutSnapshot` 狀態（初值 `{ weapons: [], passives: [] }`）。
- store 新增 action `setLoadout(l: LoadoutSnapshot)`；`start()` 時重置為空。

### FR-3 接線（Game）
- `Game` 在升級握手呼叫 `store.offerUpgrades(...)` 的同一處，先呼叫 `store.setLoadout(this.world.loadoutSnapshot())`。
- 涵蓋一般升級與寶箱免費升級（皆走同一握手路徑）。

### FR-4 進化狀態（純函式）
- 新增 `src/engine/systems/loadout.ts`：
  ```ts
  type EvolutionStatus = 'evolved' | 'ready' | 'pending'
  function evolutionStatus(
    weapon: { kind: WeaponKind; level: number; evolved?: boolean },
    ownedPassives: PassiveKind[],
  ): EvolutionStatus
  ```
  - `weapon.evolved` → `'evolved'`
  - 否則：`level >= maxLevel` 且 `ownedPassives` 含 `evolution.requires` → `'ready'`
  - 否則 → `'pending'`
  - 判定邏輯須與 `leveling.buildCandidates` 的進化條件一致。

### FR-5 UI 呈現（UpgradeModal）
- 在三選一卡片**上方**新增「目前持有」區，分武器/被動兩欄。
- 武器每項：顯示名稱 + 等級。
  - 未進化：`WEAPON_DEFS[kind].label` + `Lv{level}`（滿級顯示 `MAX`）。
  - 已進化：`WEAPON_DEFS[kind].evolution.label` + `★`。
  - 進化提示（依 `evolutionStatus`）：
    - `evolved` → `★ 已進化`
    - `ready` → `可進化！`（醒目色）
    - `pending` → `進化需：滿級＋{PASSIVE_DEFS[evolution.requires].label}`
- 被動每項：`PASSIVE_DEFS[kind].label` + `Lv{level}`（滿級顯示 `MAX`）。
- 樣式沿用免疫主題；`MAX`/`可進化` 以 `--antigen`/`--immune-accent-strong` 點綴。窄螢幕（卡片轉直排）持有區置頂、可橫向捲動/縮字級、不破版、尊重 `prefers-reduced-motion`。

## Acceptance Criteria

詳見 acceptance.md（唯一驗收來源）。

## Edge Cases

- 持有快照為空（理論上升級時至少有起始武器）：持有區若某欄為空則不顯示該欄標題。
- 武器全滿級但缺對應被動：顯示 `pending` 提示（明確列出所需被動），即本功能要解決的情境。
- 已進化武器：顯示進化名 + `★ 已進化`，不再顯示需求。
- 被動達上限（6）：照常列出；不影響顯示。

## Data Model Changes

- `src/stores/game.ts`：新增 `LoadoutSnapshot` 介面、`loadout` 狀態、`setLoadout` action。
- `src/engine/World.ts`：新增 `loadoutSnapshot()`；type-only import `LoadoutSnapshot`。
- 新增 `src/engine/systems/loadout.ts`（`EvolutionStatus` + `evolutionStatus`）。
- **不修改** `Summary` 形狀、既有 store 欄位、武器/被動數值。

## State Changes

- `store.loadout` 於每次提供升級選項時更新、`start()` 時清空。
- 既有升級握手、phase 狀態機不變。

## UI Behaviour

- 持有區僅於升級彈窗（`phase === 'upgrading'`）顯示，與三選一卡片同時出現。
- 進化提示即時反映當前 build（每次開彈窗以最新快照重算）。

## Non-Functional Requirements

- 引擎純度：`loadoutSnapshot`/`evolutionStatus` 為純函式、無 Vue/Pinia 執行期依賴、無 `Math.random()`。
- `evolutionStatus` 與 `loadoutSnapshot` 走 TDD 單元測試；UI 屬呈現層、以 typecheck/build/實機驗證。
- 既有 168 單元測試維持全綠；引擎/ store 既有形狀只新增不修改。
