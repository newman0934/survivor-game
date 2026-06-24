# Tasks — 排行榜（leaderboard）

逐 task 執行；詳細步驟與完整程式碼見 `plan.md`。每個 task 一個邏輯變更、各自 commit。
（排行榜屬呈現/膠水層、不寫單元測試、以 typecheck+build+實機驗證。既有 154 測試須維持全綠、不動 saveStore/引擎/store。）

- [ ] **Task 1：Leaderboard.vue 元件** — 純呈現，props `{ runs: RunRecord[] }`、emit `close`；表格七欄（名次/存活/擊殺/等級/角色/地圖/日期）+ 空狀態 + 壞 date「—」+ M:SS/日期格式化。typecheck。commit。
- [ ] **Task 2：MainMenu 按鈕 + App 串接 + 驗證** — MainMenu 加「排行榜」按鈕發 `open-leaderboard`；App 一次 loadSave 保留 `runs`、over 後刷新、新增 `showLeaderboard` 開關、渲染 Leaderboard overlay（僅 menu 可開）；typecheck + `npm test`（154）+ build + 實機驗證；更新 acceptance.md 與 progress.md。commit。

## 驗收門檻（全綠才算完成）
- `npm run typecheck`、`npm test`（154）、`npm run build` 全通過
- 不修改 `src/persistence/saveStore.ts`、`src/engine/**`、`src/stores/game.ts`
- 排名直接用 runs 既有順序（不再排序）；空狀態 / 壞 date / 未知 kind 皆有處理
- acceptance.md 所有項目勾選（含實機：開排行榜、關閉保留選擇、進榜後可見、空狀態）
- progress.md 反映最新狀態（階段 4「計分 / 排行榜」勾選）
