# Tasks — 玩家/敵人造型精緻化

逐 task 執行；詳細步驟與程式碼見 `plan.md`。每個 task 一個邏輯變更、各自 commit。
（呈現層：不寫單元測試，以實機截圖驗證；既有 119 測試須維持全綠。）

- [ ] **Task 1：helper + 玩家** — `sprites.ts` 新增 lighten/groundShadow/shaded、重寫 drawPlayer。commit。
- [ ] **Task 2：五種敵人** — 重寫 drawEnemy（黏液/蜘蛛/重甲/尖角/巨獸 + 立體感）；實機截圖驗證。commit。
- [ ] **Task 3：驗證與進度** — test + typecheck + build + 實機完整截圖；更新 acceptance.md 與
  progress.md。commit。

## 驗收門檻（全綠才算完成）
- 既有 `npm test`（119）、`npm run typecheck`、`npm run build` 全通過
- acceptance.md 所有項目勾選（含實機目視）
- progress.md 反映最新狀態
