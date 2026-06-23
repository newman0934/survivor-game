# Tasks — 多地圖

逐 task 執行；詳細步驟與程式碼見 `plan.md`。每個 task 一個邏輯變更、各自 commit。

- [ ] **Task 1：型別與定義表** — `types.ts`（MapKind/MapDef）+ 建 `systems/mapDefs.ts`
  （MAP_DEFS/MAP_ORDER）。commit。
- [ ] **Task 2：World 套用地圖** — 建構子加 map、spawnIntervalMult、scaleEnemyHp（三個 spawn 入口）、
  視覺欄位 + 測試。commit。
- [ ] **Task 3：背景視覺渲染** — `drawBackgroundGrid` 加 color/alpha、`PixiRenderer` 傳網格色 +
  設背景底色。commit。
- [ ] **Task 4：選圖流程串接** — `Game.start` 加 map、`App.vue` 改吃 {character, map}、
  `MainMenu.vue` 加地圖卡排 + emit({character, map})。commit。
- [ ] **Task 5：驗證與進度** — test + typecheck + build + 實機煙霧測試；更新 acceptance.md 與
  progress.md。commit。

## 驗收門檻（全綠才算完成）
- `npm test`、`npm run typecheck`、`npm run build` 全通過
- acceptance.md 所有項目勾選
- progress.md 反映最新狀態
