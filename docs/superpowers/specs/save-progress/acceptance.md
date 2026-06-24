# Acceptance — 進度存檔（localStorage）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（saveStore 走 TDD 單元測試；UI/串接屬膠水層，以實機目視驗證；既有 142 測試維持全綠。）

_驗證日期：2026-06-24_

## 資料模型與型別
- [x] 新增 `SaveData` / `RunRecord` / `CumulativeStats` / `StorageLike` 型別
- [x] `CharacterKind` / `MapKind` 以型別匯入引擎 types，不引入執行期依賴
- [x] 引擎 `types.ts`、`stores/game.ts` 皆未修改

## saveStore 模組（含單元測試）
- [x] `loadSave`：空 localStorage 回空白存檔（runs=[]、stats 全 0）
- [x] `loadSave`：合法存檔正確還原
- [x] `loadSave`：壞 JSON 回空白存檔、不丟例外
- [x] `loadSave`：版號不符回空白存檔
- [x] `recordRun`：首場破紀錄旗標皆 true、stats 正確初始化
- [x] `recordRun`：更佳成績更新 bestTime/bestKills/maxLevel、累加 totalKills/totalRuns
- [x] `recordRun`：存活時間平手 `isNewBestTime` 為 false（須嚴格大於）
- [x] `recordRun`：較差成績不更新最佳但仍累加總計
- [x] `recordRun`：runs 依 time 降冪、截前 10；被擠出者仍計入 totalKills/totalRuns
- [x] `recordRun`：setItem 丟例外不 crash，回傳記憶體內 save 仍正確
- [x] 所有 saveStore 邏輯無 `Math.random()`、無時間相依（date 由 run 傳入）

## App.vue 串接
- [x] 開機 / 回 `menu` 時 `loadSave()`，stats 以 props 傳給 MainMenu
- [x] 轉入 `over` 時組 RunRecord（summary.time/kills/level + 當局 character/map）呼叫 `recordRun()`
- [x] recordRun 回傳的破紀錄旗標與 stats 以 props 傳給 GameOver
- [x] 引擎 / game.ts / Game 迴圈未因此修改

## UI 呈現
- [x] GameOver 顯示「最佳存活：M:SS」
- [x] GameOver 破存活紀錄顯示「🏆 新紀錄！」；破擊殺紀錄獨立提示
- [x] MainMenu 顯示總擊殺 / 遊玩場數 / 最佳存活 / 最高等級；無存檔顯示 0 或「—」
- [x] 時間以 M:SS 格式顯示；套免疫主題配色；尊重 `prefers-reduced-motion`

## 不變項（硬性）
- [x] 引擎純度 / 確定性不變；模擬迴圈不碰存檔
- [x] 既有 142 單元測試全綠
- [x] 任何存檔層異常都不影響遊玩（讀錯回空白、寫錯靜默略過）

## 驗證快照（完成時填寫）
- [x] 單元測試全綠（既有 142 + saveStore 11 = 153 測試，2026-06-24 驗證）
- [x] 型別檢查（vue-tsc）乾淨（2026-06-24 驗證）
- [x] Production build 乾淨（2026-06-24 驗證）
- [ ] 實機驗證：玩一場 → 結算顯示紀錄/破紀錄 → 回主選單見統計 → 重整瀏覽器統計仍在、0 功能相關 console error（待玩家 npm run dev 確認）
- [x] progress.md 已更新
