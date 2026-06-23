# Tasks — 地圖背景視覺強化

逐 task 執行；詳細步驟與程式碼見 `plan.md`。每個 task 一個邏輯變更、各自 commit。
（`bgHash` 走 TDD 單元測試；`drawMapBackground`/renderer 接線屬呈現層、以實機驗證；既有測試須維持全綠。）

- [ ] **Task 1：bgHash（TDD）** — 新增 `sprites.bg.test.ts`（確定性/區間/分布）→ 紅 → 實作
  `bgHash(gx,gy)` → 綠。commit。
- [ ] **Task 2：drawMapBackground + 接線** — `sprites.ts` 加 `drawTerrain`/`drawAmbient`/`drawMapBackground`；
  `World` 加唯讀 `mapKind`；`PixiRenderer.render()` 改呼叫。型別/build + 三圖實機驗證。commit。
- [ ] **Task 3：驗證與進度** — `npm test` + typecheck + build + 實機完整驗證；更新 acceptance.md 與
  progress.md。commit。

## 驗收門檻（全綠才算完成）
- `npm test`（既有 + 新增 bgHash 3 項）、`npm run typecheck`、`npm run build` 全通過
- acceptance.md 所有項目勾選（含三圖實機目視 + 捲動穩定 + FPS）
- progress.md 反映最新狀態
