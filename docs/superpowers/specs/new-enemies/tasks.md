# Tasks — 新增三種敵人（噴吐病原 / 分裂菌 / 膿疱自爆體）

逐 task 執行；詳細步驟與程式碼見 `plan.md`。每個 task 一個邏輯變更、各自 commit。
（AI/生怪/死亡鉤走 TDD；造型/renderer 屬呈現層、不寫單元測試、實機驗證。既有 131 測試須維持全綠。）

- [ ] **Task 1：敵人定義 + 型別** — `EnemyKind`+3、`EnemyDef`+選用欄位（spit/splitInto/explode）、`projShape`+'toxin'；`ENEMY_DEFS`+3、`ENEMY_ORDER`。typecheck + spawn 測試。commit。
- [ ] **Task 2：敵彈 factory + 噴吐 AI（TDD）** — `createEnemyProjectile`；`steerSpitter`/`spitterTick` + dispatch；先寫失敗測試再實作。commit。
- [ ] **Task 3：World 接線** — `enemyProjectiles` 欄位；spitter 開火；敵彈飛行/命中玩家/清理；`killEnemy` 分裂+爆炸死亡鉤；補 World.test。commit。
- [ ] **Task 4：造型 + renderer** — drawEnemy 三 case（噴吐/分裂/膿疱）+ drawProjectile toxin + renderer 納入 enemyProjectiles。實機驗證。commit。
- [ ] **Task 5：驗證與進度** — `npm test` + typecheck + build + 模擬無 Math.random 確認 + 實機完整驗證；更新 acceptance.md 與 progress.md。commit。

## 驗收門檻（全綠才算完成）
- `npm test`（既有 131 + 新測試）、`npm run typecheck`、`npm run build` 全通過
- 模擬（enemyAI/spawn/World）無 `Math.random()`
- 既有五種敵人數值/行為不變
- acceptance.md 所有項目勾選（三機制 + 敵彈 + 造型實機目視）
- progress.md 反映最新狀態
