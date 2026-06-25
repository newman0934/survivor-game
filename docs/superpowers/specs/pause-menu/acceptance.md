# Acceptance — 遊戲中暫停選單（pause-menu）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（store 暫停轉換為純邏輯、寫單元測試；PauseMenu/PauseButton/App 接線屬呈現/整合層，
以 typecheck/build + 瀏覽器實機驗證。既有 189 測試維持全綠、引擎模擬/確定性零改動。）

_驗證日期：2026-06-26_

## phase 與 store
- [x] `Phase` 新增 `'paused'`
- [x] `pauseGame()` 僅在 `playing` 生效（→ `paused`）；其餘 phase 呼叫不改變狀態
- [x] `resumeGame()` 僅在 `paused` 生效（→ `playing`）；其餘 phase 呼叫不改變狀態

## 觸發
- [x] ESC 在 `playing`→暫停、`paused`→恢復（切換）；`upgrading`/`over`/`menu` 忽略（實機：升級中按 ESC 無效）
- [x] PauseButton 戰鬥中（`playing`）右上角顯示、點擊暫停；`upgrading`/`over` 不顯示（實機：升級時鈕隱藏）
- [x] ESC 監聽於 `App.vue`，元件卸載時移除（無殘留 listener）

## PauseMenu 元件
- [x] 重用 `<Overlay>`/`<Panel>` 與 `.ui-btn`，標題「暫停」+ 繼續/重新開始/回主選單三鈕
- [x] `phase==='paused'` 時以既有 fade 顯示
- [x] 繼續→`resumeGame()`；重新開始→既有 `restart()`；回主選單→既有 `toMenu()`

## 引擎接線
- [x] `watch(phase)`：`paused`→`game.pause()`、`playing`→`game.resume()`
- [x] 暫停時模擬停止 step、續渲染；恢復後續跑（實機：敵人凍結）

## 行為與邊界
- [x] 從暫停「重新開始」/「回主選單」不記錄為一場戰績/死亡（實機：開賽→暫停→回主選單後場數不變）
- [x] 暫停不影響確定性（恢復後無縫續跑）
- [x] 行動端可用暫停鈕暫停、選單按鈕可點（390px 實機驗證）
- [x] 連續快速 ESC 切換正確、不卡死
- [x] HUD 擊殺數位移調整、不與暫停鈕重疊

## 不變項（硬性）
- [x] 引擎模擬/系統/World 計算/確定性零改動
- [x] 其餘 overlay（主選單/升級/結算/排行榜）不退化
- [x] 既有 189 單元測試全綠（新增 4 筆 store 暫停測試 → 共 193）

## 驗證快照（完成時填寫）
- [x] 型別檢查（vue-tsc）乾淨
- [x] Production build 乾淨
- [x] 單元測試全綠（193 = 189 + 4 store 暫停）
- [x] 實機驗證（瀏覽器）：ESC/鈕暫停恢復、三功能正確、暫停時敵人凍結、放棄不計戰績（場數不變）、
      手機（390px）可暫停、桌機+行動寬度不破版、0 功能相關 console error（僅既有 favicon 404）
- [x] progress.md 已更新
