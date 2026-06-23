# Acceptance — 地圖背景視覺強化

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（呈現層功能，地貌/動畫以實機目視驗證；bgHash 以單元測試驗證。）

_驗證日期：（完成時填寫）_

## 背景繪製進入點
- [ ] `sprites.ts` 新增 `drawMapBackground(g, kind, cx, cy, viewW, viewH, clock)`
- [ ] `PixiRenderer.render()` 改呼叫 `drawMapBackground`，不再直接呼叫 `drawBackgroundGrid`
- [ ] `drawBackgroundGrid` 簽章不變、被 `drawMapBackground` 內部沿用

## 確定性 hash helper
- [ ] 新增 `bgHash(gx, gy)` 純函式，回傳 [0,1)
- [ ] 單元測試：相同輸入同輸出（確定性）
- [ ] 單元測試：輸出落在 [0,1) 區間
- [ ] 單元測試：分布不集中（不同格座標有合理分散）
- [ ] 不使用 Math.random()、不使用模擬 core/rng

## 地面特徵層（依 kind）
- [ ] plains：淡綠草叢（短線）+ 零星小石
- [ ] lava：暗色岩裂折線 + 餘燼亮點
- [ ] tundra：淺藍冰裂折線 + 雪堆塊
- [ ] 只繪製可視範圍內格子（沿用視窗裁切迴圈）
- [ ] 同一世界座標往返一致（捲動穩定重現）

## 氛圍動畫層（依 kind，靠 clock）
- [ ] plains：草屑/光點緩慢飄移
- [ ] lava：餘燼亮點 alpha 脈動 + 上升火星
- [ ] tundra：雪點緩緩飄落（螢幕空間環繞）
- [ ] 粒子數固定上限、不隨時間累積

## World mapKind
- [ ] World 新增唯讀 `mapKind: MapKind`，建構時由 map 參數設定
- [ ] 底色仍由 `world.mapBgColor` 設定

## 不變項
- [ ] 模擬、碰撞、生怪、難度倍率、相機、entity 造型完全不變
- [ ] 每張圖底色沿用既有 MAP_DEFS.bgColor
- [ ] `Game.stop()` / `PixiRenderer.destroy()` 維持冪等

## 確定性與架構邊界
- [ ] 地面地貌走 bgHash 純函式、氛圍動畫走 renderer clock；相同 seed 模擬結果不變
- [ ] 只動 sprites.ts（呈現層）+ World 新增 mapKind + PixiRenderer 換呼叫；引擎/store/型別契約不變

## 驗證快照（完成時填寫）
- [ ] 新增 bgHash 單元測試通過
- [ ] 既有單元測試（Vitest）全數維持通過
- [ ] 型別檢查（vue-tsc）乾淨
- [ ] Production build 乾淨
- [ ] 實機驗證：三張地圖各自地貌/氛圍動畫如設計、捲動穩定、FPS 正常、0 功能相關 console error
- [ ] progress.md 已更新
