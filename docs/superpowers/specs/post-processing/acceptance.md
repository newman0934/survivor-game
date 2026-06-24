# Acceptance — 整體調性/後製

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（後製屬呈現層、無新增單元測試；以 typecheck/build/實機目視驗證；既有 173 測試維持全綠、引擎/store 零改動。）

_驗證日期：（待填）_

## 依賴與架構
- [ ] `package.json` 新增 `pixi-filters` 依賴
- [ ] 後製濾鏡套於 `app.stage`（涵蓋世界層 + 特效層 + 搖桿；不影響 Vue DOM 疊層）
- [ ] 後製集中於 renderer 模組，參數為頂部具名常數
- [ ] 不修改引擎/ store / Summary / 既有型別

## 後製效果
- [ ] 泛光：`AdvancedBloomFilter`，保守參數（亮部才發散）
- [ ] 色彩分級：`ColorMatrixFilter`（內建），輕微對比/飽和/免疫藍綠冷調
- [ ] 暈影：螢幕四角柔和壓暗覆蓋層，隨 resize 重繪

## 行動裝置降級
- [ ] 偵測 coarse pointer/觸控 → 不建立 bloom（保留 grade + vignette）
- [ ] 無 `matchMedia` 環境視為非 coarse、不丟例外

## 容錯與清理
- [ ] 濾鏡建立以 try/catch 包住，失敗退回無濾鏡正常渲染、不丟例外
- [ ] `destroy()` 清除濾鏡與暈影覆蓋物且冪等（重複呼叫安全）
- [ ] resize 時暈影重繪貼合新尺寸

## 不變項（硬性）
- [ ] 不碰模擬/確定性；引擎/ store 零改動
- [ ] 既有 173 單元測試全綠
- [ ] 後製任何異常不影響可玩性

## 驗證快照（完成時填寫）
- [ ] 型別檢查（vue-tsc）乾淨
- [ ] Production build 乾淨
- [ ] 單元測試全綠（173，不新增/不破壞）
- [ ] 實機驗證：桌機畫面有泛光/色調/暈影且精緻不過曝、HUD 文字清晰不受影響、行動裝置無 bloom 但有色調/暈影且不掉幀、重開無殘留、0 功能相關 console error（待玩家 npm run dev 確認）
- [ ] progress.md 已更新
