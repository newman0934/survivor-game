# Spec — 地圖背景精修（map-background-polish）

## Overview

全面精修血管/胃/肺泡三場景的背景，沿四個方向提升：**結構深度感**（新增大尺度地貌層）、
**色調與氛圍**（暖核漸層 + 更豐富色斑）、**細節密度**（每場景多加特徵變體）、**動態生命感**
（背景大尺度元素隨 clock 緩動）。全部在 `src/engine/sprites.ts` 的 `drawMapBackground` 與其
helper；純呈現層、確定性（`bgHash` + clock，無 `Math.random`），疊在既有全域後製基底上。

## Business Requirements

- 把背景從「點綴撒在黑底」提升為「身處某個器官內」，提升整體精緻度與沉浸感。
- 維持效能（背景每幀重畫）與確定性（無限捲動穩定重現）。

## Functional Requirements

### FR-1 結構深度層（新增 `drawMapStructure`）
- 在背景最底新增大尺度、低 alpha、世界座標（隨鏡頭捲動）的結構層：
  - **血管**：數條斜向血漿流紋寬色帶 + 邊緣淡血管壁弧度。
  - **胃**：大尺度黏膜皺褶脊（厚實皺脊 + 柔陰影）。
  - **肺泡**：成簇大肺泡囊輪廓 + 淡支氣管分支線。
- 大形狀數量受控（少量），位置走 `bgHash`／視野格點，確保確定性與效能。

### FR-2 色調與氛圍
- 新增柔和**暖核漸層**（中央略亮略暖、向外漸暗）：血管暖紅、胃琥珀、肺泡藍綠；與後製暈影互補。
- `groundPatches` 加一個中間色階並略提 alpha，減少死黑、色溫更鮮明（既有三層 falloff 結構保留）。

### FR-3 細節密度（擴充 `drawTerrain`）
- 每場景新增 1–2 種特徵變體（仍受可視格點上限約束）：
  - 血管：纖維蛋白絲（細淡網絲）。
  - 胃：胃小凹（暗點凹陷）。
  - 肺泡：微血管網（淡紅細線）。
- 既有特徵（紅血球/皺褶/酸泡/肺泡/氣孔/血小板）保留。

### FR-4 動態生命感（clock 驅動，確定性）
- 血管：血漿流紋寬帶緩慢漂移。
- 胃：黏膜皺褶脊緩慢蠕動波（上下起伏）。
- 肺泡：大肺泡囊極緩呼吸縮放。
- 全部以 renderer `clock` 計算、無 `Math.random`、無累積狀態（每幀依 clock 重算）。

### FR-5 繪製順序
- `drawMapBackground` 依序：結構層 → 暖核漸層 → 色斑 → 地面特徵 → 氛圍粒子（由遠而近、由底而上）。

## Acceptance Criteria

詳見 acceptance.md（唯一驗收來源）。

## Edge Cases

- 無限捲動：所有地貌走 `bgHash`（世界格點），鏡頭移動穩定重現、不閃爍。
- 大尺度動態（漂移/蠕動/呼吸）幅度克制，不致暈眩或破壞可讀性。
- 暖核漸層不過亮，與後製疊加後不過曝；暗場景不致死黑。

## Data Model Changes

- 無。僅擴充 `src/engine/sprites.ts` 繪製函式；不改引擎型別/ World / store / 模擬。

## State Changes

- 無模擬狀態改動。背景為 renderer 每幀重畫的視覺輸出。

## UI Behaviour

- 三場景背景更具結構、色彩、細節與緩動；前景 entity/HUD 不受影響。

## Non-Functional Requirements

- **確定性**：地貌位置走 `bgHash`、動畫走 `clock`，**零 `Math.random`**。
- **效能**：背景每幀重畫；新增 draw call 克制（結構層少量大形狀、細節受格點上限約束），維持流暢。
- **純呈現層**：只動 `sprites.ts`；引擎/模擬/ store / 既有 173 測試零改動。
- 沿用慣例不寫繪製單元測試；以 typecheck/build + 瀏覽器實機截圖驗證。既有 `bgHash` 單元測試保留。
