# Acceptance — 打擊頓挫 + 震屏（hit-stop-shake）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（EffectsLayer 頓挫計時/冷卻為純邏輯、寫單元測試；震屏觸發接線/Game 凍結屬呈現/整合層，
以 typecheck/build + 瀏覽器實機驗證。既有 193 測試維持全綠、World/模擬/確定性零改動。）

_驗證日期：（待填）_

## EffectsLayer 震屏與頓挫
- [ ] 抽出公開 `shake(intensity)`；`hurt()` 改呼叫它，受傷震屏行為不變
- [ ] `hitStop(seconds)` 設定頓挫凍結、受全域冷卻節流（冷卻內忽略）
- [ ] `update()` 每幀以 DT 遞減頓挫剩餘與冷卻；`isHitStopped()` 隨到期轉 false
- [ ] `prefers-reduced-motion: reduce` 時 shake/hitStop 縮為 0（啟動查一次 media query）

## Game 凍結
- [ ] 迴圈在累積/step 前檢查頓挫；凍結時不累積、不 step、續渲染、無事後追趕
- [ ] `PixiRenderer.isHitStopped()` 委派 effects 供 Game 讀取

## 震屏觸發分級（PixiRenderer 接線）
- [ ] 一般小怪死亡微震；nova/進化大招中震；大型死亡中大震；Boss 受擊大震；Boss 死亡最大震
- [ ] 玩家受傷沿用既有 `hurt()`（紅暈 + 震屏）

## 頓挫觸發
- [ ] 大型死亡（自爆體/超級）短頓挫；Boss 受擊短頓挫（冷卻節流）；Boss 死亡稍長頓挫
- [ ] 一般小怪死亡不頓挫

## 邊界與可及性
- [ ] Boss 高頻受擊：冷卻確保頓挫不連發、不卡頓
- [ ] 同幀多大型死亡：頓挫不疊加、震屏不超上限
- [ ] reduced-motion：不震不頓、畫面穩定
- [ ] 頓挫不影響確定性（僅本地 wall-clock 暫停）

## 不變項（硬性）
- [ ] World/system/模擬計算/RNG/確定性零改動
- [ ] `EffectsLayer.update()` 簽章不變；`hurt()` 行為不變
- [ ] 既有 193 單元測試全綠（新增 EffectsLayer 頓挫測試後總數上升）

## 驗證快照（完成時填寫）
- [ ] 型別檢查（vue-tsc）乾淨
- [ ] Production build 乾淨
- [ ] 單元測試全綠（193 + 新增 EffectsLayer 頓挫測試）
- [ ] 實機驗證（瀏覽器）：分級震屏、大時刻頓挫、Boss 高頻受擊不連抖、一般擊殺不卡頓、
      玩家受傷不變、reduced-motion 關閉、0 功能相關 console error
- [ ] progress.md 已更新
