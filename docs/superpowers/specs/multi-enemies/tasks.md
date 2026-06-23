# Tasks — 多種敵人

逐 task 執行；詳細步驟與程式碼見 `plan.md`。每個 task 為一個邏輯變更、各自 commit。

- [ ] **Task 1：型別基礎** — `types.ts`：新增 `EnemyKind`、`EnemyDef`；`Entity` 加
  `enemyKind?` / `behaviorTimer?`。
- [ ] **Task 2：敵人定義表** — 建 `systems/enemyDefs.ts`（`ENEMY_DEFS` + `ENEMY_ORDER`）。commit。
- [ ] **Task 3：factory 依種類建怪** — `createEnemy(pos, kind)` 讀 ENEMY_DEFS + 測試。commit。
- [ ] **Task 4：加權選種** — `spawn.ts` 新增 `pickEnemyKind`（時間解鎖 + 加權）+ 測試。commit。
- [ ] **Task 5：敵人 AI** — 建 `systems/enemyAI.ts`（直追 + charger 衝刺狀態機）+ 測試。commit。
- [ ] **Task 6：World 整合** — 選種生怪、`spawnSwarmAt` 群襲 4 隻、AI 改用 `steerEnemy` + 測試。commit。
- [ ] **Task 7：渲染** — `PixiRenderer` 依 `enemyKind` 取色。commit。
- [ ] **Task 8：驗證與進度** — test + typecheck + build + 瀏覽器煙霧測試；更新 acceptance.md 與
  progress.md。commit。

## 驗收門檻（全綠才算完成）
- `npm test`、`npm run typecheck`、`npm run build` 全通過
- acceptance.md 所有項目勾選
- progress.md 反映最新狀態
