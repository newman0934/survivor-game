# Tasks — 程式化美術

逐 task 執行；詳細步驟與程式碼見 `plan.md`。每個 task 一個邏輯變更、各自 commit。
（呈現層 feature：不寫單元測試，以實機截圖驗證；既有 99 測試須維持全綠。）

- [ ] **Task 1：繪製函式** — 建 `src/engine/sprites.ts`（drawPlayer/drawEnemy/drawGem/
  drawProjectile/drawOrbit/drawBackgroundGrid/drawGarlicAura + dim helper）。commit。
- [ ] **Task 2：接造型 + 網格** — `PixiRenderer` 改 Container 化 sprite、背景網格、大蒜光環、
  clock；靜態造型接線。實機截圖驗證造型/網格。commit。
- [ ] **Task 3：動畫 + 閃白** — render 加 animate（旋轉/脈動/朝向）與 applyHitFlash（命中白色覆蓋）。
  實機截圖驗證。commit。
- [ ] **Task 4：驗證與進度** — test + typecheck + build + 實機完整煙霧測試；更新 acceptance.md 與
  progress.md。commit。

## 驗收門檻（全綠才算完成）
- 既有 `npm test` 全通過（99）、`npm run typecheck`、`npm run build` 乾淨
- acceptance.md 所有項目勾選（含實機目視）
- progress.md 反映最新狀態
