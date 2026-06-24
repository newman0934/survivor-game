# Acceptance — 排行榜

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（排行榜為純呈現/膠水層，以 typecheck + build + 實機目視驗證；既有 154 測試維持全綠、不動 saveStore/引擎/store。）

_驗證日期：（待填）_

## 元件 Leaderboard.vue
- [ ] props `{ runs: RunRecord[] }`、emit `close`
- [ ] 表格逐列顯示名次 / 存活時間(M:SS) / 擊殺 / 等級 / 角色名 / 地圖名 / 日期(YYYY/MM/DD)
- [ ] 名次依 `runs` 陣列順序（saveStore 已依存活時間降冪），元件不再排序
- [ ] 角色名以該角色顏色點綴（沿用 CHARACTER_DEFS / MAP_DEFS）
- [ ] 空狀態：`runs` 為空顯示「尚無紀錄，快去存活看看！」、不渲染表格列
- [ ] 壞 date（非有限數）該列日期顯示「—」、不 crash
- [ ] 「關閉」按鈕發 `close`
- [ ] 套免疫主題配色 / `prefers-reduced-motion` / 窄螢幕不破版

## MainMenu 變更
- [ ] 新增「排行榜」按鈕，發 `open-leaderboard`
- [ ] 既有 `start` emit、`stats` prop、統計概覽不變

## App.vue 串接
- [ ] 開機 `loadSave()` 保留 `runs`，新增 `runs` 反應式狀態傳給 Leaderboard
- [ ] 進入 `over` 後以 `recordRun` 回傳的 `save.runs` 刷新 `runs`
- [ ] 新增 `showLeaderboard` 開關；MainMenu `open-leaderboard` → true、Leaderboard `close` → false
- [ ] 排行榜 overlay 僅於 `phase === 'menu'` 可開；關閉後選擇狀態保留

## 不變項（硬性）
- [ ] 不修改 `src/persistence/saveStore.ts`、`src/engine/**`、`src/stores/game.ts`
- [ ] 既有 154 單元測試全綠
- [ ] 資料容錯由既有 saveStore 保證（讀壞 → runs=[] → 空狀態）

## 驗證快照（完成時填寫）
- [ ] 型別檢查（vue-tsc）乾淨
- [ ] Production build 乾淨
- [ ] 單元測試全綠（154，不新增/不破壞）
- [ ] 實機驗證：主選單開排行榜見前 N 名 → 關閉保留選擇 → 玩一場進榜後重開可見 → 無存檔顯示空狀態、0 功能相關 console error（待玩家 npm run dev 確認）
- [ ] progress.md 已更新
