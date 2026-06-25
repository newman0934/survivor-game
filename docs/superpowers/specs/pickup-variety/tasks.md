# Tasks — 撿取物多樣化（pickup-variety）

逐 task 執行；詳細步驟與完整程式碼見 `plan.md`。**建議 inline 執行**（撿取物造型/掉落需瀏覽器實機看）。
（World 掉落/效果為純 TS、走 TDD 寫測試；factory/視覺接線屬呈現/整合層，以 typecheck/build + 瀏覽器驗證。
既有 198 測試維持全綠；掉落用獨立 seeded `pickupRng`、不擾動既有 spawn/combat 串流；既有寶石/寶箱/升級/戰鬥邏輯不變。）

- [ ] **Task 1：型別 + pickupDefs + factory** — types 加 `'pickup'`/`PickupKind`/`Entity.pickupKind`；新 `pickupDefs.ts`（`PICKUP_DEFS` 主題色）；`createPickup`。typecheck。commit。
- [ ] **Task 2：World 掉落/拾取/效果（TDD）** — 先寫效果失敗測試（heal 夾上限、vacuum 收全場）→ 加 `pickupRng`(獨立)/`pickupEntities`/`pickups()`、killEnemy `maybeDropPickup`(mercy heal + 互斥)、拾取迴圈 + `applyPickup` + filter；測試全綠。commit。
- [ ] **Task 3：視覺接線 + 驗證 + 文件** — `sprites.ts` `drawPickup`(heal 綠十字/vacuum 紫漩渦、色取 PICKUP_DEFS)；PixiRenderer import + build switch + sync 迴圈；typecheck + `npm test`(198+新) + build + 瀏覽器(低血掉回血/撿 vacuum 全場寶石飛來/血滿不掉 heal/造型)；更新 acceptance/progress。commit。

## 驗收門檻（全綠才算完成）
- `npm run typecheck`、`npm test`(198 + 新增 pickup 測試)、`npm run build` 全通過
- 只動 types/pickupDefs(新)/factory/World/sprites/PixiRenderer(+World.test)/progress/acceptance；既有寶石/寶箱/升級/戰鬥零改動
- 回血(mercy)+全場吸取正確、確定性不變、造型/吸取正常、血滿不掉 heal
- acceptance.md 所有項目勾選（含瀏覽器實機驗證）
- progress.md 反映最新狀態
