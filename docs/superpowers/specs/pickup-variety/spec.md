# Spec — 撿取物多樣化（pickup-variety）

## Overview

在現有「經驗寶石（gem）」與「寶箱（chest）」之外，新增兩種戰場掉落撿取物：
**回血**（拾取即回復部分 HP）與**全場吸取**（拾取即把全場經驗寶石一次收取）。
採資料驅動（仿既有 enemy/weapon 模式）：新增 `pickup` entity 種類 + `pickupKind` 欄位 + `pickupDefs` 登錄表，
未來加新撿取物只需加一筆。掉落走 seeded rng（確定性），效果操作 World 既有狀態。

## Business Requirements

- 增加戰場當下的變化與驚喜，提升撿取的玩法層次。
- 回血提供低血翻盤的生存手感（mercy 機制）。
- 全場吸取提供清場/收集的滿足感。
- 維持確定性（可重現）。

## Functional Requirements

- **FR-1 型別與資料**：`EntityKind` 新增 `'pickup'`；`Entity` 新增選填 `pickupKind?: PickupKind`（`'heal' | 'vacuum'`）。
  新增 `systems/pickupDefs.ts`：`PickupKind` 型別與 `PICKUP_DEFS` 登錄表（主題色等 metadata）。
- **FR-2 factory**：`createPickup(pos: Vec2, kind: PickupKind): Entity`。
- **FR-3 World 掉落**：敵人死亡處以 `this.rng` 擲骰掉落——全場吸取隨時低機率；回血僅當
  `player.hp < player.maxHp × HEAL_DROP_HP_FRAC` 時可能掉（mercy）；一次擊殺最多掉一個（互斥）。
- **FR-4 World 拾取與效果**：新增 `pickupEntities` 陣列（+ getter + 末段 filter 清理）；
  仿寶石/寶箱以 `attractGem` + `pickupRadius` 吸取、碰玩家本體即拾取並呼叫 `applyPickup(kind)`：
  - `heal`：`hp = min(maxHp, hp + maxHp × HEAL_FRAC)`（夾上限）。
  - `vacuum`：啟動一段 `VACUUM_DURATION` 期間，寶石迴圈**不分距離**把全部寶石加速（`VACUUM_PULL_SPEED`）吸向玩家、
    逐顆飛抵後由既有拾取收取（保留飛行收束手感，而非瞬間消失）。
  拾取推送 `'pickup'` 音效。
- **FR-5 視覺**：`PixiRenderer` 加 `pickup` 顏色與既有 sync/z-order 接線；`sprites.ts` 加程式化造型
  （heal 綠、vacuum 紫，免疫主題、略大於寶石、微脈動）。

## Acceptance Criteria

詳見 `acceptance.md`（唯一驗收來源）。重點：低血掉回血並回血、撿 vacuum 全場寶石收取、
血滿不掉 heal、掉落確定性、typecheck/build 乾淨、新增 World 測試與既有 198 全綠。

## Edge Cases

- 血滿（或高於門檻）時擊殺：不掉 heal（mercy 閘）。
- 回血超過 maxHp：夾在 maxHp、不溢出。
- vacuum 時場上無寶石：安全無作用、不報錯。
- vacuum 收取大量寶石觸發升級：沿用既有 `grantXp`/pendingLevelUps 握手，正常暫停選卡。
- 同一擊殺：最多掉一個撿取物（heal/vacuum 互斥），且不影響既有寶石/寶箱掉落。
- 確定性：相同 seed + 相同擊殺序列 → 相同掉落。

## API Contracts

- `pickupDefs.ts`：匯出 `PickupKind`、`PICKUP_DEFS: Record<PickupKind, PickupDef>`。
- `factory.ts`：新增 `createPickup`。
- `World`：新增 `pickupEntities`、`pickups()`、`applyPickup(kind)`（內部）；既有 API 不變。
- `Entity`：新增選填 `pickupKind`；既有欄位不變。

## Data Model Changes

`EntityKind` 增 `'pickup'`；`Entity` 增選填 `pickupKind`。新增 `PickupKind`/`PickupDef`/`PICKUP_DEFS`。
無持久化變更。

## State Changes

新增 `World.pickupEntities` 執行期陣列。無遊戲階段（phase）變更。

## UI Behaviour

- 撿取物於敵人死亡處掉落、進入吸取範圍朝玩家飛、碰玩家即觸發效果（即時）。
- 回血即時提升血條；全場吸取使所有寶石飛向玩家並轉為經驗。
- 無 HUD/overlay 變更（即時效果）。

## Non-Functional Requirements

- **確定性**：掉落擲骰一律走 `this.rng`（seeded），不使用 `Math.random`；效果操作既有 World 狀態。
- **效能**：撿取物數量極少（低機率掉落），沿用既有吸取/清理迴圈，無顯著開銷。
- **架構純度**：掉落/效果為純 TS World 邏輯；渲染為呈現層；不碰 Vue/store/確定性以外行為。
- **可維護性**：資料驅動，新增撿取物只加 `PICKUP_DEFS` 一筆 + 效果分支。
