# Tasks — 多角色

逐 task 執行；詳細步驟與程式碼見 `plan.md`。每個 task 一個邏輯變更、各自 commit。

- [ ] **Task 1：型別與定義表** — `types.ts`（CharacterKind/CharacterDef）+ 建
  `systems/characterDefs.ts`（CHARACTER_DEFS/CHARACTER_ORDER）。commit。
- [ ] **Task 2：World 套用角色** — 建構子加 character、套起始武器/數值/血/被動、playerColor + 測試。commit。
- [ ] **Task 3：玩家顏色渲染** — `drawPlayer` 加 color 參數、`PixiRenderer` 傳 world.playerColor。commit。
- [ ] **Task 4：選角流程串接** — `Game.start` 加 character、`App.vue` 記住選擇並傳遞、
  `MainMenu.vue` 選角卡 UI + emit('start', kind)。commit。
- [ ] **Task 5：驗證與進度** — test + typecheck + build + 實機煙霧測試；更新 acceptance.md 與
  progress.md。commit。

## 驗收門檻（全綠才算完成）
- `npm test`、`npm run typecheck`、`npm run build` 全通過
- acceptance.md 所有項目勾選
- progress.md 反映最新狀態
