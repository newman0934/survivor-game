# Acceptance — 遊戲內隊伍造型材質 + 發光（B1）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（純程序繪製屬呈現層、不寫單元測試；以 typecheck/build + 瀏覽器截圖驗證；既有 181 測試維持全綠、引擎/store 零改動。）

_驗證日期：（待填）_

## 共用材質 helper（sprites.ts）
- [ ] 固定光源常數 `LIGHT`（左上）
- [ ] `membrane` / `innerShade` / `rimLight` / `specular` / `emissiveCore` 五個可組合 helper
- [ ] 沿用既有 `lighten` / `dim`

## 套用全隊伍（既有輪廓保留）
- [ ] 4 角色：膜身材質 + 細胞核 emissiveCore（冷光）
- [ ] 8 病原：膜身材質 + 毒核/感染核 emissiveCore；自爆體核更亮
- [ ] 投射物：抗體叉端/穿孔素針尖/毒液毒核加發光點
- [ ] 寶石/補體環/寶箱：輕度統一（非重點）

## 發光克制
- [ ] 僅核/能量點發光、膜身不發光；與 bloom 疊加不過曝至看不清輪廓

## 不變項（硬性）
- [ ] 只動 sprites.ts；引擎/模擬/ World / store 零改動
- [ ] 既有 181 單元測試全綠
- [ ] 命中閃白 / 相機跟隨 / 既有動畫 transform 不受影響
- [ ] 材質為 sprite 建立時一次性繪製、不影響每幀 FPS

## 驗證快照（完成時填寫）
- [ ] 型別檢查（vue-tsc）乾淨
- [ ] Production build 乾淨
- [ ] 單元測試全綠（181，不新增/不破壞）
- [ ] 實機驗證（瀏覽器截圖）：4 角色 + 代表性病原 + 投射物 材質立體、發光核被 bloom 暈染、輪廓清晰不過曝、無破圖、FPS 正常、0 功能相關 console error
- [ ] progress.md 已更新
