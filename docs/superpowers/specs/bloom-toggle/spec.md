# Spec — Bloom 開關（bloom-toggle）

## Overview

讓泛光（bloom）在手機與電腦**都預設開啟**（移除原本「觸控裝置一律強制關 bloom」），
並新增使用者可在**暫停選單**切換的 bloom 開關；選擇以 localStorage 跨場次/重開瀏覽器記住。
純呈現層——不碰模擬/確定性/store summary。引擎只收一個 `bloomEnabled` 布林、不依賴持久化，
由 App.vue 作為持久化與 UI 的單一出處。

## Business Requirements

- 手機也能享有 bloom（畫面更精緻）；弱機可自行關閉維持效能。
- 玩家可隨時（遊戲中暫停）切換 bloom，即時生效。
- 設定跨場次保留，不必每次重設。

## Functional Requirements

- **FR-1 設定持久化**：新增 `persistence/settingsStore.ts`（仿 saveStore：注入式 `StorageLike`、獨立 key
  `survivor-settings-v1`、韌性回預設）：`Settings { bloom: boolean }`、`loadSettings()`（**預設 `bloom: true`**）、
  `saveSettings(s)`。讀取異常回預設、寫入異常靜默略過。
- **FR-2 後製運行時切換**：`postProcessing.ts` 移除手機 `prefersLightweight()` 強制關 bloom 的 gating；
  constructor 收 `bloomEnabled` 決定初始；抽 `buildFilters(bloom)` 設 `app.stage.filters`；新增
  `setBloom(enabled)` 運行時重建濾鏡鏈（bloom+grade ↔ 只 grade）。grade/vignette 始終保留、不受開關影響。
- **FR-3 引擎接線**：`PixiRenderer.create(canvasParent, bloomEnabled)` 傳給 `PostProcessing`，加
  `setBloom(enabled)` 委派；`Game.start(..., bloomEnabled)` 傳給 renderer，加 `setBloom(enabled)` 委派。
- **FR-4 App 持久化與注入**：App.vue 開機 `loadSettings()` → `bloomEnabled` ref；`startGame` 把它傳入
  `Game.start`；切換時翻轉 ref → `saveSettings()` → `game?.setBloom(...)` 即時生效。
- **FR-5 暫停選單開關**：`PauseMenu.vue` 加 `bloom: boolean` prop 與 `toggle-bloom` 事件；於按鈕區加一列
  ghost 開關顯示「泛光：開 / 泛光：關」，點擊發 `toggle-bloom`；App 接事件處理。

## Acceptance Criteria

詳見 `acceptance.md`（唯一驗收來源）。重點：兩平台預設開 bloom、暫停選單可即時切換、設定持久化、
grade/vignette 不受影響、typecheck/build 乾淨、新增 settings 測試與既有 200 全綠。

## Edge Cases

- 無 localStorage / 壞資料 / 無 window：`loadSettings` 回預設（bloom: true），不丟例外。
- 濾鏡建立失敗（既有 try/catch）：退回無濾鏡正常渲染，切換不致崩潰。
- 遊戲中（playing/paused）切換：即時重建濾鏡鏈生效；不影響模擬/確定性。
- 連續快速切換：每次重建 filters，狀態與按鈕顯示一致。
- 寫入失敗（無痕/配額滿）：靜默略過，記憶體內仍正確、遊玩不受影響。

## API Contracts

- `settingsStore.ts`：匯出 `Settings`、`StorageLike`（或重用）、`loadSettings()`、`saveSettings(s)`。
- `PostProcessing`：constructor `(app, bloomEnabled)`；新增 `setBloom(enabled: boolean)`。
- `PixiRenderer`：`create(canvasParent, bloomEnabled)`；新增 `setBloom(enabled)`。
- `Game`：`start(canvasParent, seed, character, map, bloomEnabled)`；新增 `setBloom(enabled)`。
- `PauseMenu.vue`：新增 prop `bloom: boolean`、事件 `toggle-bloom`；既有 resume/restart/menu 不變。

## Data Model Changes

新增 `Settings { bloom: boolean }` 與獨立 localStorage key。無引擎資料/既有存檔結構變更。

## State Changes

無遊戲階段（phase）變更；新增 App 的 `bloomEnabled` UI 狀態（持久化）。

## UI Behaviour

- 暫停選單顯示「泛光：開/關」一列，點擊即時切換、畫面發光強弱隨之改變。
- 設定保留：重開瀏覽器/下一場沿用上次選擇。

## Non-Functional Requirements

- **架構純度**：引擎只收 `bloomEnabled` 布林、不 import 持久化；App 為持久化/UI 單一出處；不碰確定性。
- **韌性**：設定讀寫異常皆有預設/略過，永不影響遊玩。
- **效能**：bloom 預設開放兩平台（使用者可關）；切換為重建少量濾鏡、開銷小。
- **相容**：grade/vignette 始終保留，與 bloom 開關獨立。
