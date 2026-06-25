# Tasks — 遊戲中暫停選單（pause-menu）

逐 task 執行；詳細步驟與完整程式碼見 `plan.md`。**建議 inline 執行**（需瀏覽器實機按 ESC/鈕看暫停）。
（store 暫停轉換走 TDD 寫測試；元件/接線屬呈現/整合層，以 typecheck/build + 瀏覽器驗證。既有 189 測試維持全綠；引擎模擬/system/World 計算/確定性零改動；重用 D1 Overlay/Panel/.ui-btn。）

- [ ] **Task 1：store paused phase + action（TDD）** — 先寫 `game.test.ts` 失敗測試（pauseGame 僅 playing、resumeGame 僅 paused、其餘不變）→ `Phase` 加 `'paused'` + `pauseGame`/`resumeGame` guard action；測試全綠。commit。
- [ ] **Task 2：PauseMenu + PauseButton 元件** — PauseMenu 重用 Overlay/Panel/.ui-btn（標題「暫停」+ 繼續/重新開始/回主選單，emits）；PauseButton 膜質鈕（呼叫 store.pauseGame）；typecheck + build。commit。
- [ ] **Task 3：App 接線 + HUD 位移 + 驗證 + 文件** — App import + watch(paused→pause) + ESC 監聽（切換、卸載移除）+ 渲染 PauseButton(playing)/PauseMenu(paused)；Hud 擊殺數位移避開鈕；typecheck + `npm test`(189+新測試) + build + 瀏覽器（ESC/鈕/三功能/凍結/放棄不計/手機）；更新 acceptance/progress。commit。

## 驗收門檻（全綠才算完成）
- `npm run typecheck`、`npm test`(189 + 新增 store 暫停測試)、`npm run build` 全通過
- 只動 stores/game.ts(+測試)、App.vue、Hud.vue、PauseMenu.vue(新)、PauseButton.vue(新)、progress.md、acceptance.md；引擎/其餘 overlay 零改動
- ESC/鈕可暫停恢復、三功能正確、暫停時模擬凍結、放棄不計戰績、手機可暫停、不破版
- acceptance.md 所有項目勾選（含瀏覽器實機驗證）
- progress.md 反映最新狀態
