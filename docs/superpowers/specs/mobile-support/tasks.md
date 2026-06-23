# Tasks — 手機支援（觸控 + RWD）

逐 task 執行；詳細步驟與程式碼見 `plan.md`。每個 task 一個邏輯變更、各自 commit。

- [ ] **Task 1：TouchInput** — 建 `core/touchInput.ts`（joystickVector 純函式 + TouchInput 類別）+
  joystickVector 單元測試。commit。
- [ ] **Task 2：合併輸入 + 畫搖桿** — `Game` 接 TouchInput（觸控優先、否則鍵盤）、`PixiRenderer`
  螢幕 ui 層 + drawJoystick。commit。
- [ ] **Task 3：RWD** — `index.html` 視口/touch-action/overscroll、`MainMenu` 窄螢幕 media query。commit。
- [ ] **Task 4：驗證與進度** — test + typecheck + build + 行動裝置模擬驗證；更新 acceptance.md 與
  progress.md。commit。

## 驗收門檻（全綠才算完成）
- `npm test`、`npm run typecheck`、`npm run build` 全通過
- acceptance.md 所有項目勾選
- progress.md 反映最新狀態
