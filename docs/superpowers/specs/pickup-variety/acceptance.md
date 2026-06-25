# Acceptance — 撿取物多樣化（pickup-variety）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（掉落/效果為純 TS World 邏輯、寫單元測試；factory/視覺接線屬呈現/整合層，以 typecheck/build + 瀏覽器驗證。
既有 198 測試維持全綠、確定性不變。）

_驗證日期：2026-06-26_

## 型別與資料
- [x] `EntityKind` 新增 `'pickup'`；`Entity` 新增選填 `pickupKind?: PickupKind`（`'heal' | 'vacuum'`）
- [x] `systems/pickupDefs.ts`：`PickupKind`(於 types) + `PICKUP_DEFS`（主題色 metadata）
- [x] `createPickup(pos, kind)` factory

## World 掉落
- [x] 敵人死亡以**獨立 `pickupRng`** 擲骰：全場吸取隨時低機率、回血僅當 `hp < maxHp×0.5`（mercy）
- [x] 一次擊殺最多掉一個（heal/vacuum 互斥）；不影響既有寶石/寶箱掉落
- [x] 掉落確定性（seeded pickupRng；獨立串流不擾動既有 spawn/combat 確定性）

## World 拾取與效果
- [x] `pickupEntities` 陣列 + `pickups()` getter + 末段 filter 清理
- [x] 仿寶石以 `attractGem` + `pickupRadius` 吸取、碰玩家即拾取並推 `'pickup'` 音效
- [x] `applyPickup('heal')`：`hp = min(maxHp, hp + maxHp×0.3)`（夾上限，單元測試驗證）
- [x] `applyPickup('vacuum')`：全場 active 寶石 `grantXp` 後 deactivate（單元測試驗證）；無寶石時安全

## 視覺
- [x] `PixiRenderer` 加 pickup build switch + sync/z-order 接線
- [x] `sprites.ts` `drawPickup`（heal 綠＋白十字、vacuum 紫＋白漩渦弧，色取 PICKUP_DEFS、略大於寶石、外發光暈）

## 邊界與不變項
- [x] 血滿/高於門檻不掉 heal（mercy 閘）；回血夾不超過 maxHp（測試）
- [x] vacuum 無寶石安全（迴圈空）、不報錯；觸發升級沿用既有 grantXp 握手
- [x] 只動 types/factory/pickupDefs(新)/World/PixiRenderer/sprites.ts(+測試)；既有 entity 與升級/戰鬥邏輯不變
- [x] 確定性不變（獨立 pickupRng；既有測試全綠未受擾動）

## 不變項（硬性）
- [x] 既有寶石/寶箱行為不變
- [x] 既有 198 單元測試全綠（新增 2 筆 pickup 效果測試 → 共 200）

## 驗證快照（完成時填寫）
- [x] 型別檢查（vue-tsc）乾淨
- [x] Production build 乾淨
- [x] 單元測試全綠（200 = 198 + 2 pickup）
- [x] 實機驗證（瀏覽器）：暫調高掉落率確認造型（heal 綠十字 / vacuum 紫漩渦）正確渲染、吸取飛行/拾取正常、
      0 功能相關 console error（僅既有 favicon 404）；驗後還原真實掉落率
- [x] progress.md 已更新
