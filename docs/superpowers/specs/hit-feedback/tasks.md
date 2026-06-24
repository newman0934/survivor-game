# Tasks — 打擊反饋特效強化（hit-feedback / B3）

逐 task 執行；詳細步驟與完整程式碼見 `plan.md`。**建議 inline 執行**（特效需瀏覽器打怪看效果微調）。
（純 renderer 特效屬呈現層、不寫單元測試；以 typecheck/build + 瀏覽器實機驗證。既有 181 測試須維持全綠、引擎/模擬/store/sprites.ts 零改動。）

- [ ] **Task 1：命中火花/濺紅** — effects.ts 加 `addDot` helper + `spawnHit`（火花+主題色體液）；PixiRenderer.applyHitFlash 敵人 hp 下降加呼叫 `spawnHit`（保留傷害數字）。typecheck + build + 瀏覽器打怪微調。commit。
- [ ] **Task 2：逐病原死亡特效** — effects.ts 加 `addShard` + `EnemyKind` import、改寫 `spawnKill` 依 kind（細菌濺射/病毒碎片/孢子爆孢/自爆大爆/超級加大/其餘基礎）；PixiRenderer 死亡接線傳 `e.enemyKind`；typecheck + `npm test`(181) + build + 瀏覽器各病原微調；更新 acceptance/progress。commit。

## 驗收門檻（全綠才算完成）
- `npm run typecheck`、`npm test`(181 不變)、`npm run build` 全通過
- 只動 effects.ts + PixiRenderer.ts（+ 文件）；引擎/模擬/store/確定性零改動
- 命中火花+濺紅、各病原死法不同、粒子克制走上限不爆量、重開無殘留
- acceptance.md 所有項目勾選（含瀏覽器實機驗證）
- progress.md 反映最新狀態
