# Spec — 噪聲紋理視差背景（noise-background）

## Overview

以程序生成的噪聲紋理 + 視差 `TilingSprite` 取代目前向量背景的「調性底」（結構層/色斑/暖核），
提供連續、有機、會緩動的組織質感底；保留可辨識的地貌特徵（紅血球/肺泡/酸泡等）與氛圍粒子疊於其上。
純呈現層、不碰模擬/確定性；噪聲純函式走 TDD，其餘以瀏覽器截圖驗證。

## Business Requirements

- 突破向量圖元背景的質感天花板，讓三場景背景達到「連續有機組織」的精緻度。
- 維持效能（比每幀重畫大量向量色斑更省）與「程序化、零外部美術資源」哲學。

## Functional Requirements

### FR-1 噪聲純函式（可測）
- 新增 `src/engine/core/noise.ts`：value noise + fBm + **ridged fBm**（折痕）+ **cellular/Voronoi**（細胞）純函式，
  給定座標與 seed **確定性可重現**、輸出在已知範圍（0..1）、支援 period 平鋪。
- 例：`valueNoise`/`fbm`/`ridgedFbm`/`cellular`。
- 用途：讓三場景採**不同性格的噪聲**（非僅換色）。

### FR-2 噪聲紋理生成（依場景採不同性格）
- 開機時以離屏 canvas 用 FR-1 噪聲畫一張**無縫平鋪**（wrap）灰階 `Texture`（如 256²），**依 MapKind 採不同噪聲**：
  - 血管：domain-warp fBm（血漿流動渦流/大理石流紋）
  - 胃：ridged fBm（黏膜皺褶折痕）
  - 肺泡：cellular/Voronoi（肺泡蜂窩細胞）
- 純呈現層，生成為一次性；可用 `Math.random` 取 seed（renderer 既有 `effects.ts` 鏡頭震動亦用 `Math.random`，本模組同屬視覺、不受「模擬無 Math.random」約束）。

### FR-3 視差層（TilingSprite）
- 2 層螢幕空間 `TilingSprite`（鋪滿畫面）：深層（大尺度取樣、慢速）+ 中層（細尺度、稍快）。
- 各層 `tilePosition` 依玩家座標 × 各自視差係數捲動 → 縱深視差。
- 各層依 `MapKind` 套 `tint`（血管暖紅 / 胃琥珀 / 肺藍綠）+ 適當 blend，疊出有機組織底。
- 共用同一張灰階噪聲紋理（靠取樣尺度/tint 區分層與場景，省記憶體）。

### FR-4 中央暖核提亮
- 以 canvas 漸層生成一張中央透明→外稍暖的提亮層（或直接於噪聲層上疊），維持縱深聚焦（取代移除的向量 `warmCore`）。

### FR-5 PixiRenderer 接線
- `PixiRenderer` 建構時 `new NoiseBackground(app, mapKind)`，噪聲層加在 world/`grid` **之下**（最底）。
- 每幀 `update(playerPos)` 更新各層 `tilePosition`；resize 調整層尺寸；`destroy()` 釋放生成的紋理（仿暈影，重開不累積）。

### FR-6 移除向量調性底、保留特徵
- `sprites.ts` 的 `drawMapBackground` 僅保留 `drawTerrain`（地貌特徵）+ `drawAmbient`（粒子）。
- 移除 `groundPatches` / `drawMapStructure` / `warmCore`（含相關色表常數），由噪聲層取代。

## Acceptance Criteria

詳見 acceptance.md（唯一驗收來源）。

## Edge Cases

- 噪聲生成或 TilingSprite 建立失敗：try/catch 退回（背景僅少噪聲底，特徵/粒子照常），不影響可玩性。
- resize / 旋轉：層尺寸更新貼合，紋理不需重生。
- 重新開始：`destroy()` 釋放紋理，無累積洩漏。
- 無 canvas/document（非瀏覽器）：生成防護（理論上 renderer 僅在瀏覽器跑）。

## Data Model Changes

- 新增 `src/engine/core/noise.ts`（純函式）、`src/engine/noiseBackground.ts`（Pixi 膠水）。
- 修改 `src/engine/PixiRenderer.ts`、`src/engine/sprites.ts`。
- 不改引擎型別/ World / store / 模擬。

## State Changes

- 無模擬狀態改動。噪聲背景為 renderer 內部視覺狀態（紋理 + TilingSprite + tilePosition）。

## UI Behaviour

- 三場景背景呈現連續有機組織底 + 視差縱深 + 中央暖核；特徵/粒子/前景 entity/HUD 不受影響。

## Non-Functional Requirements

- **不碰模擬/確定性**：背景不進入固定步長邏輯；引擎/ store / 既有 173 測試零改動。
- **效能**：TilingSprite GPU 單quad 取樣、極省；生成一次性；每幀僅更新 tilePosition。
- **韌性**：生成/建立失敗退回，不影響可玩性。
- 噪聲純函式走 TDD 單元測試；其餘呈現層以 typecheck/build + 瀏覽器截圖驗證。
