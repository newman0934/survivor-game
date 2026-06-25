# Tasks — Bloom 開關（bloom-toggle）

逐 task 執行；詳細步驟與完整程式碼見 `plan.md`。**建議 inline 執行**（需瀏覽器看 bloom 開/關畫面差異）。
（settingsStore 走 TDD 寫測試；後製/引擎/App/PauseMenu 屬呈現/整合層，以 typecheck/build + 瀏覽器驗證。
既有 200 測試維持全綠；引擎只收 bloomEnabled 布林、不 import 持久化；模擬/確定性零改動。）

- [ ] **Task 1：settingsStore（TDD）** — 先寫測試（預設 bloom:true、save→load 往返、壞資料回預設）→ 實作 `persistence/settingsStore.ts`（注入式 StorageLike、獨立 key、韌性）。commit。
- [ ] **Task 2：postProcessing setBloom + 引擎接線** — postProcessing 移除手機強制關、constructor 收 bloomEnabled、buildFilters + setBloom（grade/vignette 保留）；PixiRenderer.create/constructor 串 bloomEnabled + setBloom 委派；Game.start 串 + setBloom 委派。typecheck + build。commit。
- [ ] **Task 3：App 接線 + PauseMenu 開關 + 驗證 + 文件** — App loadSettings→bloomEnabled ref、傳入 Game.start、toggleBloom(save+game.setBloom)、傳 prop/事件給 PauseMenu；PauseMenu 加 bloom prop + toggle-bloom + 「泛光：開/關」列；typecheck + `npm test`(200+新) + build + 瀏覽器（切換畫面變化/持久化/grade-vignette 保留）；更新 acceptance/progress。commit。

## 驗收門檻（全綠才算完成）
- `npm run typecheck`、`npm test`(200 + 新增 settings 測試)、`npm run build` 全通過
- 只動 settingsStore(新+測試)/postProcessing/PixiRenderer/Game/App/PauseMenu/progress/acceptance；模擬/World/確定性/store summary 零改動
- 兩平台預設開 bloom、暫停可即時切換、設定持久化、grade/vignette 不受影響
- acceptance.md 所有項目勾選（含瀏覽器實機驗證）
- progress.md 反映最新狀態
