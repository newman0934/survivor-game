# Tasks — 升級彈窗顯示持有（loadout-display）

逐 task 執行；詳細步驟與完整程式碼見 `plan.md`。每個 task 一個邏輯變更、各自 commit。
（evolutionStatus / loadoutSnapshot 走 TDD；UI 屬呈現層、不寫單元測試、實機驗證。既有 168 測試須維持全綠。）

- [ ] **Task 1：evolutionStatus 純函式** — 新建 `src/engine/systems/loadout.ts`，`EvolutionStatus` + `evolutionStatus`（與 buildCandidates 條件一致）；先寫 4 個失敗測試再實作。typecheck。commit。
- [ ] **Task 2：持有快照管線** — store 加 `LoadoutSnapshot`/`loadout`/`setLoadout`、`World.loadoutSnapshot()`（type-only import）、`Game` 在 offerUpgrades 前 `setLoadout`；補 World.loadoutSnapshot 測試。typecheck。commit。
- [ ] **Task 3：UpgradeModal 持有區 + 驗證** — 卡片上方顯示武器/被動 + 等級 + 進化提示（evolutionStatus + WEAPON_DEFS/PASSIVE_DEFS）；typecheck + `npm test`（173）+ build + 實機驗證；更新 acceptance.md 與 progress.md。commit。

## 驗收門檻（全綠才算完成）
- `npm run typecheck`、`npm test`（既有 168 + 新 5 = 173）、`npm run build` 全通過
- `loadoutSnapshot`/`evolutionStatus` 純函式、無 `Math.random()`、無 Vue/Pinia 執行期依賴
- 不修改 `Summary` 形狀、既有 store 欄位、武器/被動數值/行為
- `evolutionStatus` 與 `leveling.buildCandidates` 進化條件一致
- acceptance.md 所有項目勾選（含實機：持有顯示 + 進化提示三態正確）
- progress.md 反映最新狀態
