# Spec — 遊戲中暫停選單（pause-menu）

## Overview

為遊戲中（playing）加入暫停功能：以 ESC 鍵或畫面暫停鈕暫停，顯示暫停選單（繼續／重新開始／回主選單）。
沿用既有「phase 驅動 overlay」模式新增 `'paused'` phase，重用 D1 的膜質 Overlay/Panel 與共用按鈕語言。
目前遊戲無任何暫停手段（phase 僅 menu/playing/upgrading/over），這補上關鍵體驗缺口並兼顧行動端。

## Business Requirements

- 玩家能隨時暫停遊戲（看手機、離開、思考），不必死亡或硬退。
- 桌機與行動端皆可暫停（行動端無 ESC，需畫面鈕）。
- 視覺與 D1 精修後的選單/彈窗一致。

## Functional Requirements

- **FR-1 phase 與 store**：`Phase` 新增 `'paused'`；`store` 加 `pauseGame()`（僅 `playing`→`paused`）與
  `resumeGame()`（僅 `paused`→`playing`）兩個有 guard 的 action；其餘 phase 呼叫不改變狀態。
- **FR-2 引擎暫停接線**：`App.vue` 的 `watch(phase)` 擴充——`paused`→`game.pause()`、`playing`→`game.resume()`
  （沿用既有 upgrading 暫停機制）。
- **FR-3 ESC 觸發**：`App.vue` 加 window keydown 監聽（`onBeforeUnmount` 移除）：`playing`→`pauseGame()`、
  `paused`→`resumeGame()`（切換）；upgrading/over/menu 時忽略。
- **FR-4 PauseMenu 元件**：`PauseMenu.vue` 重用 `<Overlay>`/`<Panel>` 與 `.ui-btn`，標題「暫停」+ 三按鈕
  （繼續／重新開始／回主選單），`phase==='paused'` 時以既有 fade 轉場顯示；分別發 `resume`/`restart`/`menu` 事件。
- **FR-5 PauseButton 元件**：`PauseButton.vue` 戰鬥中（`playing`）右上角膜質暫停鈕（比照 MuteButton），
  點擊呼叫 `pauseGame()`；置於靜音鈕旁，HUD 擊殺數位移調整避免重疊。
- **FR-6 接線**：`App.vue` 渲染 PauseMenu（接 resume→`resumeGame()`、restart→既有 `restart()`、menu→既有 `toMenu()`）
  與 PauseButton（`playing` 時顯示）。

## Acceptance Criteria

詳見 `acceptance.md`（唯一驗收來源）。重點：ESC/鈕可暫停與恢復、選單三功能正確、暫停時模擬凍結、
放棄不計戰績、行動端可暫停、typecheck/build 乾淨、新增 store 測試與既有 189 全綠。

## Edge Cases

- 升級中（`upgrading`）按 ESC：忽略，不暫停（必須先選卡）；暫停鈕不顯示。
- 結束（`over`）/主選單（`menu`）按 ESC：忽略。
- 從暫停選「重新開始」或「回主選單」：中途放棄，**不記錄為一場/死亡**（戰績僅於進入 `over` 記錄，放棄不經過 `over`）。
- 暫停時引擎停止 step、持續渲染；恢復後續跑，確定性不受影響。
- 行動端無 ESC：以暫停鈕暫停；選單按鈕可點。
- 連續快速 ESC：切換 guard 確保狀態一致、不卡死。

## API Contracts

- `store`：新增 `pauseGame()`、`resumeGame()` action 與 `'paused'` phase；既有 API 不變。
- `PauseMenu.vue`：無 props；emits `resume`、`restart`、`menu`。
- `PauseButton.vue`：無 props；emits `pause`（或直接呼叫 store）；不讀引擎。
- `App.vue`：渲染兩元件並接既有 `restart()`/`toMenu()`；新增 ESC 監聽。

## Data Model Changes

`Phase` 型別新增 `'paused'` 成員。無引擎/持久化資料結構變更。

## State Changes

新增 `playing ⇄ paused` 轉換（由 `pauseGame`/`resumeGame`）。其餘 phase 轉換不變。

## UI Behaviour

- `playing` 顯示暫停鈕；按 ESC 或鈕 → `paused`、顯示暫停選單、引擎凍結。
- `paused` 按 ESC 或「繼續」→ `playing`、選單消失、引擎恢復。
- 「重新開始」→ 同角色/地圖重開；「回主選單」→ 回選單。
- overlay 進出沿用既有 fade。

## Non-Functional Requirements

- **效能/確定性**：暫停僅停止模擬推進，零確定性影響；純前端呈現。
- **可及性**：暫停選單按鈕 `:focus-visible`（沿用 `.ui-btn`）；尊重 `prefers-reduced-motion`（既有 fade）。
- **行動端**：暫停鈕觸控可用；選單 RWD 不破版。
- **架構純度**：引擎模擬/系統/World 計算零改動；UI 層不新增引擎執行期耦合。
