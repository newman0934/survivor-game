# Spec — 整體調性/後製（全域視覺後製）

## Overview

為遊戲畫面加入全域後製濾鏡：**泛光（bloom）**、**色彩分級（color grade）**、**暈影（vignette）**，
一次拉升整體質感。濾鏡套在 PixiJS `app.stage`（涵蓋世界層 + 特效層 + 觸控搖桿）；Vue 製的 HUD/
選單/彈窗是獨立 DOM 疊層，不受影響。行動裝置自動關閉 bloom 保效能。

純呈現層：只動 `PixiRenderer`（+ vignette 覆蓋物），**不碰模擬/確定性/store/引擎邏輯**。

## Business Requirements

- 以最少改動、最高 CP 值一次提升全畫面質感（精緻、電影感），作為後續美術/背景/UI 精修的視覺基底。
- 不犧牲可玩性與行動裝置效能。

## Functional Requirements

### FR-1 新增依賴
- 新增 `pixi-filters`（pixi.js v8 官方配套濾鏡庫）至 `dependencies`。

### FR-2 後製濾鏡（套於 app.stage）
- **泛光**：`AdvancedBloomFilter`（pixi-filters）。保守參數（高 threshold 只讓亮部發散、scale/brightness 適中）。
- **色彩分級**：`ColorMatrixFilter`（pixi.js 內建）。輕微對比 + 飽和 + 一抹免疫藍綠冷調。
- **暈影**：螢幕四角柔和壓暗的覆蓋層（screen-space），隨畫面 resize 重繪。
- 桌機：bloom + grade + vignette 全開；行動裝置：僅 grade + vignette（見 FR-3）。

### FR-3 行動裝置自動降級
- 偵測 coarse pointer / 觸控（`matchMedia('(pointer: coarse)')`，無 matchMedia 時退回 false）。
- 判定為行動/觸控時**不建立 bloom**（color grade 與 vignette 仍套用，兩者極輕）。

### FR-4 參數集中與克制
- bloom threshold/scale/brightness/blur、grade 對比/飽和/冷調、vignette 透明度/範圍皆為具名常數，集中於 renderer 後製模組頂部，方便調整。
- 預設走「克制」路線：精緻不過曝、不糊。

### FR-5 容錯與清理
- 濾鏡建立以 try/catch 包住；任何失敗 → 退回無濾鏡的正常渲染（不丟例外、不影響可玩性）。
- vignette 覆蓋物在 `PixiRenderer.destroy()` 時一併清除；`destroy()` 維持冪等（既有 `app.destroy(true, { children: true })` 清掉 stage 上濾鏡與覆蓋物）。
- resize 時 vignette 覆蓋物重繪以貼合新尺寸。

## Acceptance Criteria

詳見 acceptance.md（唯一驗收來源）。

## Edge Cases

- 無 `matchMedia`（極舊環境）：視為非 coarse → 桌機路徑（bloom 開）。
- pixi-filters 載入/建立濾鏡失敗：try/catch 退回無濾鏡渲染，遊戲照常。
- 重新開始 / 多次 destroy：冪等，無殘留覆蓋物或濾鏡洩漏。
- resize（旋轉裝置 / 改視窗）：vignette 重繪貼合；濾鏡不需重建。

## Data Model Changes

- 無。`package.json` 新增 `pixi-filters` 依賴；不改引擎型別/ store / Summary。

## State Changes

- 無模擬狀態改動。後製為 renderer 內部視覺狀態（濾鏡實例 + vignette 覆蓋物）。

## UI Behaviour

- 遊戲畫面（Pixi canvas）套後製；Vue HUD/選單/彈窗（DOM 疊層）視覺不變。
- 行動裝置畫面無 bloom，但仍有 color grade + vignette。

## Non-Functional Requirements

- **不碰模擬/確定性**：後製不進入固定步長迴圈邏輯；引擎/ store / 既有 173 測試零改動。
- **效能**：bloom 為 screen-space pass（成本隨解析度非物件數）；行動裝置關 bloom 確保不掉幀。
- **韌性**：後製任何異常都不得影響可玩性（容錯退回）。
- 純呈現層、無新增單元測試；以 typecheck/build/實機目視驗證。
