# Tasks — 武器進化（weapon-evolution）

逐 task 執行；詳細步驟與完整程式碼見 `plan.md`。每個 task 一個邏輯變更、各自 commit。
（型別/候選/World 效果走 TDD；視覺/UI 屬呈現層、不寫單元測試、實機驗證。既有 154 測試須維持全綠。）

- [ ] **Task 1：型別 + 進化資料表** — `WeaponEvolution`/`WeaponDef.evolution`/`Weapon.evolved`/`Entity.pierce|evolved`；`WEAPON_DEFS` 七筆 evolution（數值如 spec FR-3）。新建 weaponDefs.test。typecheck。commit。
- [ ] **Task 2：leveling 候選 + 套用（TDD）** — `evolveOption`、`buildCandidates` 加進化候選、`applyUpgradeById` 處理 `evolve:`（含三條件再驗證）；先寫 6 個失敗測試再實作。commit。
- [ ] **Task 3：World 進化效果（TDD）** — `effectiveLevel` helper、進化武器取 evolution.level、招牌行為（pierce 投射物迴圈 + factory 標記、noFalloff、halfAngle、fieldRegen、complement 命中冷卻 0.25）；先寫 4 個失敗測試再實作。commit。
- [ ] **Task 4：視覺/UI + 驗證** — drawProjectile 進化光暈、UpgradeModal 進化卡強調；typecheck + `npm test`（166）+ build + 實機驗證；更新 acceptance.md 與 progress.md。commit。

## 驗收門檻（全綠才算完成）
- `npm test`（既有 154 + 新測試 ≈12 = 166）、`npm run typecheck`、`npm run build` 全通過
- 模擬無 `Math.random()`；未進化時武器數值/行為/平衡與現況一致
- 進化三條件（滿級 + 持有所需被動 + 未進化）正確；applyUpgradeById 再驗證
- 七把進化數值/招牌行為如 spec；`evolved` 不入存檔
- acceptance.md 所有項目勾選（含實機：出卡/變強/招牌行為/投射物變色/卡片強調）
- progress.md 反映最新狀態（武器進化 + 測試數）
