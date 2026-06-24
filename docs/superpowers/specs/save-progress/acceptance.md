# Acceptance — 進度存檔（localStorage）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（saveStore 走 TDD 單元測試；UI/串接屬膠水層，以實機目視驗證；既有 142 測試維持全綠。）

_驗證日期：（待填）_

## 資料模型與型別
- [ ] 新增 `SaveData` / `RunRecord` / `CumulativeStats` / `StorageLike` 型別
- [ ] `CharacterKind` / `MapKind` 以型別匯入引擎 types，不引入執行期依賴
- [ ] 引擎 `types.ts`、`stores/game.ts` 皆未修改

## saveStore 模組（含單元測試）
- [ ] `loadSave`：空 localStorage 回空白存檔（runs=[]、stats 全 0）
- [ ] `loadSave`：合法存檔正確還原
- [ ] `loadSave`：壞 JSON 回空白存檔、不丟例外
- [ ] `loadSave`：版號不符回空白存檔
- [ ] `recordRun`：首場破紀錄旗標皆 true、stats 正確初始化
- [ ] `recordRun`：更佳成績更新 bestTime/bestKills/maxLevel、累加 totalKills/totalRuns
- [ ] `recordRun`：存活時間平手 `isNewBestTime` 為 false（須嚴格大於）
- [ ] `recordRun`：較差成績不更新最佳但仍累加總計
- [ ] `recordRun`：runs 依 time 降冪、截前 10；被擠出者仍計入 totalKills/totalRuns
- [ ] `recordRun`：setItem 丟例外不 crash，回傳記憶體內 save 仍正確
- [ ] 所有 saveStore 邏輯無 `Math.random()`、無時間相依（date 由 run 傳入）

## App.vue 串接
- [ ] 開機 / 回 `menu` 時 `loadSave()`，stats 以 props 傳給 MainMenu
- [ ] 轉入 `over` 時組 RunRecord（summary.time/kills/level + 當局 character/map）呼叫 `recordRun()`
- [ ] recordRun 回傳的破紀錄旗標與 stats 以 props 傳給 GameOver
- [ ] 引擎 / game.ts / Game 迴圈未因此修改

## UI 呈現
- [ ] GameOver 顯示「最佳存活：M:SS」
- [ ] GameOver 破存活紀錄顯示「🏆 新紀錄！」；破擊殺紀錄獨立提示
- [ ] MainMenu 顯示總擊殺 / 遊玩場數 / 最佳存活 / 最高等級；無存檔顯示 0 或「—」
- [ ] 時間以 M:SS 格式顯示；套免疫主題配色；尊重 `prefers-reduced-motion`

## 不變項（硬性）
- [ ] 引擎純度 / 確定性不變；模擬迴圈不碰存檔
- [ ] 既有 142 單元測試全綠
- [ ] 任何存檔層異常都不影響遊玩（讀錯回空白、寫錯靜默略過）

## 驗證快照（完成時填寫）
- [ ] 單元測試全綠（既有 142 + saveStore 新測試）
- [ ] 型別檢查（vue-tsc）乾淨
- [ ] Production build 乾淨
- [ ] 實機驗證：玩一場 → 結算顯示紀錄/破紀錄 → 回主選單見統計 → 重整瀏覽器統計仍在、0 功能相關 console error
- [ ] progress.md 已更新
