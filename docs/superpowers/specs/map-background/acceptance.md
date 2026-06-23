# Acceptance — 地圖背景視覺強化

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（呈現層功能，地貌/動畫以實機目視驗證；bgHash 以單元測試驗證。）

_驗證日期：2026-06-23 — 新增 bgHash 3 測試 + 既有全綠（共 122）、vue-tsc 乾淨、build 乾淨、
三圖 Playwright 截圖驗證通過。_

## 背景繪製進入點
- [x] `sprites.ts` 新增 `drawMapBackground(g, kind, cx, cy, viewW, viewH, clock)`（無網格）
- [x] `PixiRenderer.render()` 改呼叫 `drawMapBackground`，不再直接呼叫 `drawBackgroundGrid`
- [x] 背景不再畫網格線；`drawBackgroundGrid` 簽章不變、保留備用

## 地表色斑層（依 kind）
- [x] 新增 `groundPatches`：大格點疊三層同心、低透明度柔和色斑
- [x] 色系依 kind（`PATCH_COLORS`）：plains 深淺綠、lava 暗紅、tundra 深藍
- [x] 位置/大小/色選由 bgHash 決定，捲動穩定重現

## 確定性 hash helper
- [x] 新增 `bgHash(gx, gy)` 純函式，回傳 [0,1)
- [x] 單元測試：相同輸入同輸出（確定性）
- [x] 單元測試：輸出落在 [0,1) 區間
- [x] 單元測試：分布不集中（不同格座標有合理分散）
- [x] 不使用 Math.random()、不使用模擬 core/rng

## 地面特徵層（依 kind，精緻化）
- [x] plains：雙色草叢（暗綠底 + 亮綠覆蓋多筆）+ 立體碎石（落地影 + 高光）
- [x] lava：岩裂折線（陰影底 + 橙紅內光雙線）+ 餘燼（外發光暈 + 亮核）
- [x] tundra：冰裂折線（暗藍底 + 亮藍高光雙線）+ 雙層柔化雪堆
- [x] 只繪製可視範圍內格子（視窗裁切迴圈）
- [x] 同一世界座標往返一致（座標 hash 決定，與玩家位置無關）

## 氛圍動畫層（依 kind，靠 clock）
- [x] plains：草屑/光點緩慢飄移
- [x] lava：餘燼亮點 alpha 脈動 + 上升火星
- [x] tundra：雪點緩緩飄落（螢幕空間環繞）
- [x] 粒子數固定上限（N=50）、不隨時間累積

## World mapKind
- [x] World 新增唯讀 `mapKind: MapKind`，建構時由 map 參數設定
- [x] 底色仍由 `world.mapBgColor` 設定

## 不變項
- [x] 模擬、碰撞、生怪、難度倍率、相機、entity 造型完全不變
- [x] 每張圖底色沿用既有 MAP_DEFS.bgColor
- [x] `Game.stop()` / `PixiRenderer.destroy()` 維持冪等（沿用既有 grid Graphics 生命週期）

## 確定性與架構邊界
- [x] 地面地貌走 bgHash 純函式、氛圍動畫走 renderer clock；相同 seed 模擬結果不變
- [x] 只動 sprites.ts（呈現層）+ World 新增 mapKind + PixiRenderer 換呼叫；引擎/store/型別契約不變

## 驗證快照
- [x] 新增 bgHash 單元測試通過（3 項）
- [x] 既有單元測試（Vitest）全數維持通過（合計 122）
- [x] 型別檢查（vue-tsc）乾淨
- [x] Production build 乾淨
- [x] 實機驗證：三張地圖各自地貌/氛圍動畫如設計、地貌不與物件混淆、0 功能相關 console error（僅既有 favicon 404）
- [x] progress.md 已更新
