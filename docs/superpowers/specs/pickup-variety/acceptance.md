# Acceptance — 撿取物多樣化（pickup-variety）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（掉落/效果為純 TS World 邏輯、寫單元測試；factory/視覺接線屬呈現/整合層，以 typecheck/build + 瀏覽器驗證。
既有 198 測試維持全綠、確定性不變。）

_驗證日期：（待填）_

## 型別與資料
- [ ] `EntityKind` 新增 `'pickup'`；`Entity` 新增選填 `pickupKind?: PickupKind`（`'heal' | 'vacuum'`）
- [ ] `systems/pickupDefs.ts`：`PickupKind` + `PICKUP_DEFS`（主題色等 metadata）
- [ ] `createPickup(pos, kind)` factory

## World 掉落
- [ ] 敵人死亡以 `this.rng` 擲骰：全場吸取隨時低機率、回血僅當 `hp < maxHp×門檻`（mercy）
- [ ] 一次擊殺最多掉一個（heal/vacuum 互斥）；不影響既有寶石/寶箱掉落
- [ ] 掉落確定性（相同 seed + 擊殺序列 → 相同掉落）

## World 拾取與效果
- [ ] `pickupEntities` 陣列 + `pickups()` getter + 末段 filter 清理
- [ ] 仿寶石以 `attractGem` + `pickupRadius` 吸取、碰玩家即拾取並推 `'pickup'` 音效
- [ ] `applyPickup('heal')`：`hp = min(maxHp, hp + maxHp×比例)`（夾上限）
- [ ] `applyPickup('vacuum')`：全場 active 寶石 `grantXp` 後 deactivate；無寶石時安全

## 視覺
- [ ] `PixiRenderer` 加 pickup 顏色與 sync/z-order 接線
- [ ] `sprites.ts` 程式化造型（heal 綠、vacuum 紫，免疫主題、略大於寶石、微脈動）

## 邊界與不變項
- [ ] 血滿/高於門檻不掉 heal；回血夾不超過 maxHp
- [ ] vacuum 無寶石安全、不報錯；觸發升級沿用既有握手
- [ ] 只動 types/factory/pickupDefs(新)/World/PixiRenderer/sprites.ts(+測試)；既有 entity 與升級/戰鬥邏輯不變
- [ ] 確定性不變（掉落/效果走 seeded rng 與既有狀態）

## 不變項（硬性）
- [ ] 既有寶石/寶箱行為不變
- [ ] 既有 198 單元測試全綠（新增 pickup 測試後總數上升）

## 驗證快照（完成時填寫）
- [ ] 型別檢查（vue-tsc）乾淨
- [ ] Production build 乾淨
- [ ] 單元測試全綠（198 + 新增 pickup 測試）
- [ ] 實機驗證（瀏覽器）：低血掉回血並回血、撿 vacuum 全場寶石飛來收取、血滿不掉 heal、
      撿取物造型/吸取正常、0 功能相關 console error
- [ ] progress.md 已更新
