# Tasks — 空間網格接入 World

逐 task 執行；詳細步驟與程式碼見 `plan.md`。每個 task 為一個邏輯變更、各自 commit。

- [ ] **Task 1：網格基礎設施** — `World.ts`：import SpatialGrid/ENEMY_ORDER、CELL_SIZE、
  MAX_ENEMY_RADIUS、enemyGrid 欄位、rebuildEnemyGrid 並於步驟 3 後呼叫（行為不變）。commit。
- [ ] **Task 2：四處查詢改走網格** — 子彈/接觸/大蒜/聖經改用 queryRadius 候選 + 遠近混合與
  確定性功能測試。commit。
- [ ] **Task 3：驗證與進度** — test + typecheck + build + 瀏覽器煙霧測試；更新 acceptance.md 與
  progress.md（階段 2 收尾）。commit。

## 驗收門檻（全綠才算完成）
- `npm test`、`npm run typecheck`、`npm run build` 全通過（既有測試維持綠 = 行為保持）
- acceptance.md 所有項目勾選
- progress.md 反映最新狀態
