# Acceptance — 噪聲紋理視差背景

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（噪聲純函式走 TDD 單元測試；TilingSprite/接線屬呈現層、以 typecheck/build + 瀏覽器截圖驗證；既有 173 測試維持全綠、引擎/store 零改動。）

_驗證日期：（待填）_

## 噪聲純函式（含單元測試）
- [ ] `src/engine/core/noise.ts`：`valueNoise` / `fbm` 純函式
- [ ] `fbm` 給定 seed 確定性可重現、輸出落在已知範圍（0..1）
- [ ] 不同 seed 一般產生不同噪聲
- [ ] 走 TDD（先寫失敗測試）

## 噪聲背景模組（NoiseBackground，呈現層）
- [ ] 開機以 canvas 生成無縫平鋪灰階噪聲 `Texture`
- [ ] 2 層視差 `TilingSprite`（深層慢/中層快），`tilePosition` 依玩家座標 × 視差係數捲動
- [ ] 各層依 MapKind 套 tint（血管暖紅/胃琥珀/肺藍綠）+ blend
- [ ] 中央暖核提亮層維持縱深
- [ ] try/catch 退回；`destroy()` 釋放紋理；resize 貼合

## PixiRenderer 接線
- [ ] 建構時 `new NoiseBackground(app, mapKind)`，加在 world/grid 之下
- [ ] 每幀 `update(playerPos)` 更新 tilePosition；resize/destroy 串接

## sprites.ts 調整
- [ ] `drawMapBackground` 僅保留 `drawTerrain` + `drawAmbient`
- [ ] 移除 `groundPatches` / `drawMapStructure` / `warmCore`（含相關常數），無死碼

## 不變項（硬性）
- [ ] 不碰模擬/確定性；引擎/ World / store 零改動
- [ ] 既有 173 單元測試全綠（+ 噪聲新測試）
- [ ] 背景任何異常不影響可玩性

## 驗證快照（完成時填寫）
- [ ] 型別檢查（vue-tsc）乾淨
- [ ] Production build 乾淨
- [ ] 單元測試全綠（既有 173 + 噪聲新測試）
- [ ] 實機驗證（瀏覽器截圖）：三場景有機組織底 + 視差縱深 + 中央暖核 + 特徵/粒子保留、與後製疊加精緻、無破圖、FPS 正常、重開無殘留、0 功能相關 console error
- [ ] progress.md 已更新
