# Acceptance — 遊戲中暫停選單（pause-menu）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（store 暫停轉換為純邏輯、寫單元測試；PauseMenu/PauseButton/App 接線屬呈現/整合層，
以 typecheck/build + 瀏覽器實機驗證。既有 189 測試維持全綠、引擎模擬/確定性零改動。）

_驗證日期：（待填）_

## phase 與 store
- [ ] `Phase` 新增 `'paused'`
- [ ] `pauseGame()` 僅在 `playing` 生效（→ `paused`）；其餘 phase 呼叫不改變狀態
- [ ] `resumeGame()` 僅在 `paused` 生效（→ `playing`）；其餘 phase 呼叫不改變狀態

## 觸發
- [ ] ESC 在 `playing`→暫停、`paused`→恢復（切換）；`upgrading`/`over`/`menu` 忽略
- [ ] PauseButton 戰鬥中（`playing`）右上角顯示、點擊暫停；`upgrading`/`over` 不顯示
- [ ] ESC 監聽於 `App.vue`，元件卸載時移除（無殘留 listener）

## PauseMenu 元件
- [ ] 重用 `<Overlay>`/`<Panel>` 與 `.ui-btn`，標題「暫停」+ 繼續/重新開始/回主選單三鈕
- [ ] `phase==='paused'` 時以既有 fade 顯示
- [ ] 繼續→`resumeGame()`；重新開始→既有 `restart()`；回主選單→既有 `toMenu()`

## 引擎接線
- [ ] `watch(phase)`：`paused`→`game.pause()`、`playing`→`game.resume()`
- [ ] 暫停時模擬停止 step、續渲染；恢復後續跑

## 行為與邊界
- [ ] 從暫停「重新開始」/「回主選單」不記錄為一場戰績/死亡（不經過 `over`）
- [ ] 暫停不影響確定性（恢復後無縫續跑）
- [ ] 行動端可用暫停鈕暫停、選單按鈕可點
- [ ] 連續快速 ESC 切換正確、不卡死
- [ ] HUD 擊殺數位移調整、不與暫停鈕重疊

## 不變項（硬性）
- [ ] 引擎模擬/系統/World 計算/確定性零改動
- [ ] 其餘 overlay（主選單/升級/結算/排行榜）不退化
- [ ] 既有 189 單元測試全綠（新增 store 暫停測試後總數上升）

## 驗證快照（完成時填寫）
- [ ] 型別檢查（vue-tsc）乾淨
- [ ] Production build 乾淨
- [ ] 單元測試全綠（189 + 新增 store 暫停測試）
- [ ] 實機驗證（瀏覽器）：ESC/鈕暫停恢復、三功能正確、暫停時敵人凍結、放棄不計戰績、
      手機可暫停、桌機+行動寬度不破版、0 功能相關 console error
- [ ] progress.md 已更新
