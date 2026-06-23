# Tasks — Boss 敵人

逐 task 執行；詳細步驟與程式碼見 `plan.md`。每個 task 為一個邏輯變更、各自 commit。

- [ ] **Task 1：boss 敵種定義** — `types.ts` EnemyKind 加 'boss'；`enemyDefs.ts` 新增 boss 條目
  （spawnWeight 0）+ ENEMY_ORDER。commit。
- [ ] **Task 2：排除一般生怪** — `spawn.ts` pickEnemyKind 過濾 spawnWeight>0 + 測試。commit。
- [ ] **Task 3：Summary 擴充** — `stores/game.ts` 加 bossActive/bossHp/bossMaxHp（介面/state/start/
  updateSummary）。（與 Task 4 一起 commit）
- [ ] **Task 4：World 整合** — bossTimer/bossCount、spawnBossAt（隨次數縮放 hp）、step boss 段、
  summary 回報三欄 + 測試。commit（含 Task 3）。
- [ ] **Task 5：Boss 血條 UI** — 建 `ui/BossBar.vue`，`App.vue` 遊玩時渲染。commit。
- [ ] **Task 6：驗證與進度** — test + typecheck + build + 瀏覽器煙霧測試（可暫調 BOSS_INTERVAL）；
  更新 acceptance.md 與 progress.md。commit。

## 驗收門檻（全綠才算完成）
- `npm test`、`npm run typecheck`、`npm run build` 全通過
- acceptance.md 所有項目勾選
- progress.md 反映最新狀態
