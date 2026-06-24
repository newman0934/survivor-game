# Spec — UI 精修地基（ui-polish-foundation / D1）

## Overview

D（UI 介面精修）的第一個子專案，建立一套共用的「免疫膜質」視覺語言與設計 token，
讓四個 DOM overlay（主選單 / 升級彈窗 / 結算 / 排行榜）從各自手刻的扁平半透明底，
升級為一致、有材質與層次的高級感介面。本子專案只做地基與 overlay 套用；
圖示系統（D2）與 HUD/戰鬥內 UI（D3）為後續子專案，不在範圍內。

豪華主題的三塊（網頁字體 / 圖示 / 面板裝飾）中，本專案負責**字體**與**面板裝飾**地基。

## Business Requirements

- UI 精緻度需與已精修的遊戲畫面（bloom / 噪聲背景 / 發光細胞）相稱，消除落差。
- 四個 overlay 視覺一致，建立可重用的設計語言，降低後續介面開發成本。
- 維持行動裝置可用性與效能（延續專案「行動端從簡」基調）。

## Functional Requirements

- **FR-1 設計 token**：於全域 `:root` 擴充一套設計 token——面板面色、模糊強度、發光邊框、
  陰影、圓角、間距級距、字級階層、過渡時間、展示字體變數。既有 5 個變數
  （`--immune-accent`、`--immune-accent-strong`、`--antigen`、`--card-bg`、`--card-bg-hover`）保留相容。
- **FR-2 自托管展示字體**：自托管 Chakra Petch（拉丁 subset、woff2、`font-display: swap`），
  以 `@font-face` 載入，透過 `--font-display` 套於標題/數字/Lv/計時等拉丁字元；
  中文走優化系統字體棧；不走外部 CDN、離線可用。
- **FR-3 `Overlay.vue`**：無狀態 slot 元件，提供背景遮罩（毛玻璃模糊 + 中心徑向暈染 + 置中）。
  行動寬度（≤600px）降低 blur 強度。
- **FR-4 `Panel.vue`**：無狀態 slot 元件，提供「免疫膜質」容器（半透明深色面 + 1px 發光細邊 +
  柔外發光 + 頂緣膜光澤 + 圓角 + drop shadow）。內容超高可捲、不溢出。
- **FR-5 共用按鈕類別**：全域 `.ui-btn` / `.ui-btn-primary` / `.ui-btn-ghost`，含 hover 發光/浮起、
  `:active` 壓縮、`:focus-visible` 外環；統一圓角與過渡。
- **FR-6 四 overlay 套用**：MainMenu / UpgradeModal / GameOver / Leaderboard 改用
  `<Overlay>`/`<Panel>` 包裝與共用按鈕類別、套用 token；各自既有版面結構（角色/地圖卡列、
  升級卡列、loadout 持有區、排行榜表格、結算統計）與事件/資料流保留不變。

## Acceptance Criteria

詳見 `acceptance.md`（唯一驗收來源）。重點：四 overlay 套用新面板語言且功能/RWD/事件不退化；
字體正確載入並套用；typecheck/build 乾淨、既有 181 測試全綠；桌機與行動寬度實機驗證通過。

## Edge Cases

- 瀏覽器不支援 `backdrop-filter` → 退回不透明深色面，內容仍清楚可讀。
- 展示字體載入前/失敗 → `font-display: swap` 顯示系統字體，不出現隱形文字（FOIT）。
- 排行榜長表格 / 升級彈窗手機垂直卡片 / 主選單多角色卡換行 / loadout 滿級多列 / 結算多行破紀錄
  → 面板高度自適應，超出時可捲動、不破版、不溢出視窗。
- `prefers-reduced-motion: reduce` → 關閉位移/縮放動畫，僅保留必要狀態變化。

## API Contracts

- `Overlay.vue`：無 props（或僅樣式相關），預設 slot 放內容；不發事件。
- `Panel.vue`：無 props（或僅樣式相關），預設 slot 放內容；不發事件。
- 四 overlay 對外的 props / emits 簽章維持不變（如 MainMenu 的 `start`/`open-leaderboard`、
  GameOver 的 `restart`/`menu`、Leaderboard 的 `close`）。

## Data Model Changes

無。不新增/修改任何資料結構、store 狀態或持久化格式。

## State Changes

無遊戲狀態變更。phase overlay 的顯示/轉場行為（fade）維持現狀，僅視覺外殼改變。

## UI Behaviour

- 四 overlay 進場沿用既有 fade/pop 動畫；面板新增膜光澤與發光為靜態視覺，不增加干擾性動態。
- 按鈕具 hover/active/focus-visible 回饋；reduced-motion 下退化為無位移。
- 行動寬度沿用既有斷點（≤600px）行為：卡片縮放、升級卡垂直排列、表格可橫捲等不變。

## Non-Functional Requirements

- **效能**：`backdrop-filter` blur 於行動寬度降強度；展示字體 woff2 僅拉丁 subset（約 20–40KB）。
- **相依**：字體自托管、不引入執行期 JS 相依；`Overlay`/`Panel` 為純呈現 Vue 元件。
- **相容**：保留既有 5 個主題變數；不影響 HUD/BossBar/MuteButton（D3 範圍）。
- **可及性**：`:focus-visible` 可見焦點環；尊重 `prefers-reduced-motion`。
- **架構純度**：UI 層不新增對引擎的執行期耦合；引擎/模擬/store/確定性零改動。
