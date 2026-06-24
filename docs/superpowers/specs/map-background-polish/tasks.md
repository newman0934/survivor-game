# Tasks — 地圖背景精修（map-background-polish）

逐 task 執行；詳細步驟與起始程式碼見 `plan.md`。**建議 inline 執行**（純美術、需瀏覽器截圖微調）。
（純程序繪製屬呈現層、不寫繪製單元測試；以 typecheck/build + 瀏覽器截圖驗證。既有 173 測試須維持全綠、引擎/模擬/store 零改動。）

- [ ] **Task 1：結構深度層 + 暖核漸層 + 色斑增強** — sprites.ts 新增 `drawMapStructure`（血管流紋/壁、胃皺褶脊、肺泡囊，含 clock 漂移/蠕動/呼吸）+ `warmCore` + groundPatches 三色階/略提 alpha；`drawMapBackground` 依序接線（結構→暖核→色斑→特徵→粒子）。typecheck + build + 瀏覽器截圖微調。commit。
- [ ] **Task 2：細節密度 + 驗證** — drawTerrain 三場景各加一變體（纖維蛋白絲/胃小凹/微血管網，既有保留）；typecheck + `npm test`(173) + build + 瀏覽器截圖；更新 acceptance.md 與 progress.md。commit。

## 驗收門檻（全綠才算完成）
- `npm run typecheck`、`npm test`(173 不變)、`npm run build` 全通過
- 只動 sprites.ts（+ 文件）；引擎/模擬/store/確定性零改動；無 `Math.random`
- 三場景結構/暖核/細節/緩動如 spec；繪製順序正確；無限捲動穩定重現
- acceptance.md 所有項目勾選（含瀏覽器截圖實機驗證）
- progress.md 反映最新狀態
