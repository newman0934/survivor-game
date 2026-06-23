# Tasks — 新增三把武器（吞噬偽足 / 補體級聯 / 抗原脈衝）

逐 task 執行；詳細步驟與程式碼見 `plan.md`。每個 task 一個邏輯變更、各自 commit。
（武器純函式走 TDD；World 接線補 World.test；視覺屬呈現層、不寫單元測試、實機驗證。既有 122 測試須維持全綠。）

- [ ] **Task 1：型別 + 定義 + 解除上限** — `WeaponKind` 增三成員、新增 `FxEvent`；`WEAPON_DEFS` 三筆 + `WEAPON_ORDER`；`WEAPON_CAP` 4→7（視需要更新 leveling.test）。typecheck + 測試。commit。
- [ ] **Task 2：武器純函式 + 測試（TDD）** — `weapons.ts` 加 `phagocyteSweep`/`chainTargets`/`novaBurst` + 常數；先寫失敗測試再實作。commit。
- [ ] **Task 3：World 接線 + fxEventQueue** — step 加三把武器冷卻分支（套乘區、checkKills、推 hit/fx），新增 `fxEventQueue` + `consumeFxEvents`；補 World.test。commit。
- [ ] **Task 4：視覺繪製** — `EffectsLayer` 加 `spawnSweep`/`spawnChain`/`spawnNova` + flashes 回收；`PixiRenderer.applyFxEvents`；`Game` 每幀排空 fx。實機驗證。commit。
- [ ] **Task 5：驗證與進度** — `npm test` + typecheck + build + 實機完整驗證（解鎖/升級/機制/視覺/收齊 7 把）；更新 acceptance.md 與 progress.md。commit。

## 驗收門檻（全綠才算完成）
- `npm test`（既有 122 + 新測試）、`npm run typecheck`、`npm run build` 全通過
- 三純函式確定性、無 `Math.random()`
- 既有四把武器數值/行為不變
- acceptance.md 所有項目勾選（三機制 + 視覺實機目視 + 收齊 7 把）
- progress.md 反映最新狀態
