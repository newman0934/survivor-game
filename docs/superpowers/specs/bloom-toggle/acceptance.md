# Acceptance — Bloom 開關（bloom-toggle）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（settingsStore 為純邏輯、寫單元測試；postProcessing/renderer/Game/App/PauseMenu 屬呈現/整合層，
以 typecheck/build + 瀏覽器實機驗證。既有 200 測試維持全綠、模擬/確定性零改動。）

_驗證日期：（待填）_

## 設定持久化
- [ ] `persistence/settingsStore.ts`：`Settings { bloom }`、`loadSettings()`（預設 `bloom: true`）、`saveSettings(s)`
- [ ] 注入式 `StorageLike`、獨立 key `survivor-settings-v1`；讀取異常回預設、寫入異常靜默略過
- [ ] 單元測試：預設 bloom:true、save→load 往返一致、壞資料/無資料回預設

## 後製運行時切換
- [ ] `postProcessing` 移除手機強制關 bloom；constructor 收 `bloomEnabled`；`buildFilters(bloom)` + `setBloom(enabled)`
- [ ] grade/vignette 始終保留、不受 bloom 開關影響
- [ ] 濾鏡建立失敗安全退回（既有 try/catch 維持）

## 引擎接線
- [ ] `PixiRenderer.create(canvasParent, bloomEnabled)` + `setBloom(enabled)` 委派
- [ ] `Game.start(..., bloomEnabled)` + `setBloom(enabled)` 委派
- [ ] 引擎不 import 持久化（只收布林）

## App 持久化與注入
- [ ] 開機 `loadSettings()` → `bloomEnabled`；`startGame` 傳入 `Game.start`
- [ ] 切換：翻轉 → `saveSettings()` → `game?.setBloom(...)` 即時生效

## 暫停選單開關
- [ ] `PauseMenu` 加 `bloom` prop + `toggle-bloom` 事件；ghost 開關顯示「泛光：開/關」
- [ ] App 接 `toggle-bloom` 處理；既有 resume/restart/menu 不變

## 邊界與不變項
- [ ] 兩平台預設開 bloom；弱機可關
- [ ] 設定跨場次/重開瀏覽器保留
- [ ] 切換不影響模擬/確定性（僅後製重建）
- [ ] 寫入失敗不影響遊玩

## 不變項（硬性）
- [ ] 模擬/system/World/確定性零改動
- [ ] grade/vignette 與其餘 UI/overlay 不退化
- [ ] 既有 200 單元測試全綠（新增 settings 測試後總數上升）

## 驗證快照（完成時填寫）
- [ ] 型別檢查（vue-tsc）乾淨
- [ ] Production build 乾淨
- [ ] 單元測試全綠（200 + 新增 settings 測試）
- [ ] 實機驗證（瀏覽器）：暫停切「泛光：關」畫面發光變弱、切「開」恢復、重新整理後保留、
      grade/vignette 仍在、0 功能相關 console error
- [ ] progress.md 已更新
