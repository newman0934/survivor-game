# Acceptance — 噪聲紋理視差背景

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（噪聲純函式走 TDD 單元測試；TilingSprite/接線屬呈現層、以 typecheck/build + 瀏覽器截圖驗證；既有 173 測試維持全綠、引擎/store 零改動。）

_驗證日期：2026-06-25（typecheck/build/178 測試 + 三場景瀏覽器截圖實機驗證通過）_

## 噪聲純函式（含單元測試）
- [x] `src/engine/core/noise.ts`：`valueNoise` / `fbm` / `ridgedFbm` / `cellular` 純函式
- [x] 各函式給定 seed 確定性可重現、輸出落在已知範圍（0..1）、支援 period 平鋪
- [x] 不同 seed 一般產生不同噪聲
- [x] 走 TDD（先寫失敗測試，8 測試）
- [x] 三場景採不同性格噪聲：血管 warp 流動 / 胃 ridged 皺褶 / 肺 cellular 蜂窩

## 噪聲背景模組（NoiseBackground，呈現層）
- [x] 開機以 canvas 生成無縫平鋪灰階噪聲 `Texture`
- [x] 2 層視差 `TilingSprite`（深層慢/中層快），`tilePosition` 依玩家座標 × 視差係數捲動
- [x] 各層依 MapKind 套 tint（血管暖紅/胃琥珀/肺藍綠）+ blend
- [x] 中央暖核提亮層維持縱深
- [x] try/catch 退回；`destroy()` 釋放紋理；resize 貼合

## PixiRenderer 接線
- [x] 懶初始化 `new NoiseBackground(app, world.mapKind)`，加在 stage 最底（world 之下）
- [x] 每幀 `update(playerPos)` 更新 tilePosition；resize/destroy 串接

## sprites.ts 調整
- [x] `drawMapBackground` 僅保留 `drawTerrain` + `drawAmbient`
- [x] 移除 `groundPatches` / `drawMapStructure` / `warmCore`（含 PATCH_COLORS/STRUCT_COLORS/CORE_COLORS 常數），無死碼

## 不變項（硬性）
- [x] 不碰模擬/確定性；引擎/ World / store 零改動
- [x] 既有 173 單元測試全綠（+ 噪聲 5 = 178）
- [x] 背景任何異常不影響可玩性（try/catch 退回）

## 驗證快照（完成時填寫）
- [x] 型別檢查（vue-tsc）乾淨
- [x] Production build 乾淨
- [x] 單元測試全綠（178）
- [x] 實機驗證（瀏覽器截圖）：三場景連續有機組織底（血管紅肉/胃琥珀黏膜/肺藍綠）+ 視差縱深 + 中央暖核 + 特徵/粒子保留、與後製疊加精緻、無破圖、FPS 正常（2026-06-25 三場景截圖確認）
- [x] progress.md 已更新
