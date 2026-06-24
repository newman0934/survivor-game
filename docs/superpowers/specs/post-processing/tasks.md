# Tasks — 整體調性/後製（post-processing）

逐 task 執行；詳細步驟與完整程式碼見 `plan.md`。
（後製屬呈現層、無新增單元測試；以 typecheck/build/實機驗證。既有 173 測試須維持全綠、引擎/模擬/store 零改動。）

- [ ] **Task 1：pixi-filters 依賴 + PostProcessing 模組 + PixiRenderer 接線 + 驗證** —
  `npm install pixi-filters`；新建 `src/engine/postProcessing.ts`（AdvancedBloom + ColorMatrix grade + vignette 同心暗框 + `prefersLightweight` 行動偵測 + try/catch 退回）；`PixiRenderer` 建構時實例化、resize 重繪 vignette；typecheck + `npm test`（173）+ build + 實機驗證；更新 acceptance.md 與 progress.md。commit。

## 驗收門檻（全綠才算完成）
- `npm run typecheck`、`npm test`（173 不變）、`npm run build` 全通過
- 只動 `PixiRenderer.ts` + 新增 `postProcessing.ts`（+ package.json/lock + 文件）；引擎/模擬/store 零改動
- 濾鏡套 app.stage；行動裝置不建立 bloom；濾鏡失敗 try/catch 退回；destroy 冪等、resize 重繪 vignette
- acceptance.md 所有項目勾選（含實機：桌機泛光/色調/暈影、HUD 不受影響、行動無 bloom、重開無殘留）
- progress.md 反映最新狀態
