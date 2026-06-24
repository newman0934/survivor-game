# Tasks — 進度存檔（save-progress）

逐 task 執行；詳細步驟與完整程式碼見 `plan.md`。每個 task 一個邏輯變更、各自 commit。
（saveStore 走 TDD 單元測試；UI/App 串接屬呈現/膠水層、不寫單元測試、實機驗證。既有 142 測試須維持全綠。）

- [ ] **Task 1：saveStore 純模組** — 型別（`StorageLike`/`RunRecord`/`CumulativeStats`/`SaveData`）+ `loadSave`/`recordRun` + 容錯；先寫 11 個失敗測試（注入記憶體 storage）再實作。typecheck。commit。
- [ ] **Task 2：UI 呈現** — `GameOver.vue` 加最佳存活 + 破紀錄提示（props）、`MainMenu.vue` 加統計概覽（`stats` prop）。typecheck（App props 於 Task 3 補）。commit。
- [ ] **Task 3：App.vue 串接 + 驗證** — 開機 `loadSave()`、進入 `over` 上升沿 `recordRun()`、props 下傳；typecheck + `npm test`（153）+ build + 實機驗證；更新 acceptance.md 與 progress.md。commit。

## 驗收門檻（全綠才算完成）
- `npm test`（既有 142 + saveStore 11 = 153）、`npm run typecheck`、`npm run build` 全通過
- `saveStore` 無 `Math.random()`、無內部時鐘相依（date 由呼叫端傳入）
- 引擎 `engine/**` 與 `stores/game.ts` 零改動
- 任何存檔層異常都不影響遊玩（讀錯回空白、寫錯靜默略過）
- acceptance.md 所有項目勾選（含實機：結算破紀錄、主選單統計、重整後延續）
- progress.md 反映最新狀態（階段 4「進度存檔」勾選、測試數更新）
