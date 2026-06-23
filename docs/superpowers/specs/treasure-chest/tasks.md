# Tasks — 寶箱 / 隨機獎勵

逐 task 執行；詳細步驟與程式碼見 `plan.md`。每個 task 一個邏輯變更、各自 commit。

- [ ] **Task 1：型別/工廠/造型** — `types.ts` 加 'chest'、`factory.createChest` + 測試、
  `sprites.drawChest`。commit。
- [ ] **Task 2：World 整合** — chestEntities/chests()、killEnemy（重構兩處死亡點 + boss 掉箱）、
  寶箱拾取（→ pendingLevelUps）、清理 + 測試。commit。
- [ ] **Task 3：渲染寶箱** — `PixiRenderer` spriteFor 'chest' + render 清單含 chests()。commit。
- [ ] **Task 4：驗證與進度** — test + typecheck + build + 實機煙霧測試（可暫調 BOSS_INTERVAL）；
  更新 acceptance.md 與 progress.md（階段 3 收尾）。commit。

## 驗收門檻（全綠才算完成）
- `npm test`、`npm run typecheck`、`npm run build` 全通過
- acceptance.md 所有項目勾選
- progress.md 反映最新狀態
