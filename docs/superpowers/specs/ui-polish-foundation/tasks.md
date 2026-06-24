# Tasks — UI 精修地基（ui-polish-foundation / D1）

逐 task 執行；詳細步驟與完整程式碼見 `plan.md`。**建議 inline 執行**（純 CSS/視覺，需瀏覽器逐畫面截圖微調）。
（純 DOM 呈現層、無可測純邏輯，不寫單元測試；以 typecheck/build + 瀏覽器實機驗證。既有 181 測試須維持全綠；引擎/模擬/store/sprites/確定性零改動；HUD/BossBar/MuteButton 不動。）

- [ ] **Task 1：全域地基** — `npm i @fontsource/chakra-petch`；建 `src/styles/ui.css`（設計 token + `body` 字體 + `.ui-btn*`）；`main.ts` 匯入 latin-400/500/700 + ui.css。typecheck + build + 瀏覽器確認字體載入。commit。
- [ ] **Task 2：Overlay/Panel 元件 + 主選單** — 建 `Overlay.vue`（毛玻璃遮罩+暈染）、`Panel.vue`（膜質容器+@supports 退回）；改寫 `MainMenu.vue`（Overlay/Panel 包裝、按鈕換 `.ui-btn*`、h1 展示字體、刪重複 CSS）。typecheck + build + 瀏覽器截圖微調。commit。
- [ ] **Task 3：升級彈窗** — `UpgradeModal.vue` 改用 Overlay/Panel、標題展示字體；升級卡/loadout/進化金邊保留；點卡仍升級恢復遊戲。typecheck + build + 瀏覽器。commit。
- [ ] **Task 4：結算 + 排行榜** — `GameOver.vue`、`Leaderboard.vue` 改用 Overlay/Panel、按鈕換 `.ui-btn*`、h1 展示字體、進場動畫改套面板；事件不變。typecheck + build + 瀏覽器截圖兩者。commit。
- [ ] **Task 5：跨畫面驗證 + 文件** — 行動寬度（≤600px）四 overlay 不破版可捲；focus-visible / reduced-motion / no-backdrop 退化驗證；typecheck + `npm test`(181) + build；更新 acceptance/progress。commit。

## 驗收門檻（全綠才算完成）
- `npm run typecheck`、`npm test`(181 不變)、`npm run build` 全通過
- 只動 ui.css(新)/Overlay.vue(新)/Panel.vue(新)/main.ts/四 overlay/progress.md/acceptance.md；引擎/store/HUD/BossBar/MuteButton 零改動
- 四 overlay 套用膜質面板語言、字體正確、按鈕回饋、RWD 不破版、長內容可捲、reduced-motion/no-backdrop 退化正常、事件/資料流不變
- acceptance.md 所有項目勾選（含瀏覽器實機驗證）
- progress.md 反映最新狀態
