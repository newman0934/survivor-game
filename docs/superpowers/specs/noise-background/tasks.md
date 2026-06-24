# Tasks — 噪聲紋理視差背景（noise-background）

逐 task 執行；詳細步驟與完整程式碼見 `plan.md`。**建議 inline 執行**（Task 2 為純美術、需瀏覽器截圖微調）。
（噪聲純函式走 TDD；NoiseBackground/接線屬呈現層、以 typecheck/build + 瀏覽器截圖驗證。既有 173 測試須維持全綠、引擎/模擬/store 零改動。）

- [ ] **Task 1：噪聲純函式（TDD）** — 新建 `core/noise.ts`（`valueNoise`/`fbm`，確定性、period 平鋪）；先寫 5 個失敗測試再實作。typecheck。commit。
- [ ] **Task 2：NoiseBackground + 接線 + 清理** — 新建 `noiseBackground.ts`（canvas 噪聲紋理 + 2 視差 TilingSprite + 中央暖核 + per-map tint + try/catch + destroy）；`PixiRenderer` 懶初始化/update/resize/destroy；`sprites.ts` `drawMapBackground` 僅留 terrain+ambient、刪 groundPatches/drawMapStructure/warmCore 與常數；typecheck + `npm test`(178) + build + 瀏覽器三場景截圖；更新 acceptance/progress。commit。

## 驗收門檻（全綠才算完成）
- `npm run typecheck`、`npm test`(既有 173 + 噪聲 5 = 178)、`npm run build` 全通過
- 只動 `core/noise.ts`(新)、`noiseBackground.ts`(新)、`PixiRenderer.ts`、`sprites.ts`（+ 文件）；模擬/store 零改動
- 噪聲純函式確定性可重現；無向量調性底殘留死碼
- 三場景有機底 + 視差 + 暖核 + 特徵/粒子保留；背景異常退回不影響可玩性；重開無殘留
- acceptance.md 所有項目勾選（含瀏覽器截圖實機驗證）
- progress.md 反映最新狀態
