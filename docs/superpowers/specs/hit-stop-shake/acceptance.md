# Acceptance — 打擊頓挫 + 震屏（hit-stop-shake）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（EffectsLayer 頓挫計時/冷卻為純邏輯、寫單元測試；震屏觸發接線/Game 凍結屬呈現/整合層，
以 typecheck/build + 瀏覽器實機驗證。既有 193 測試維持全綠、World/模擬/確定性零改動。）

_驗證日期：2026-06-26_

## EffectsLayer 震屏與頓挫
- [x] 抽出公開 `shake(intensity)`；`hurt()` 改呼叫它，受傷震屏行為不變
- [x] `hitStop(seconds)` 設定頓挫凍結、受全域冷卻節流（HitStop helper，冷卻內忽略）
- [x] `update()` 每幀以 DT 遞減頓挫剩餘與冷卻；`isHitStopped()` 隨到期轉 false
- [x] `prefers-reduced-motion: reduce` 時 shake/hitStop 縮為 0（啟動查一次 matchMedia + early-return guard）

## Game 凍結
- [x] 迴圈在累積/step 前檢查頓挫；凍結時不累積、不 step、續渲染、無事後追趕
- [x] `PixiRenderer.isHitStopped()` 委派 effects 供 Game 讀取

## 震屏觸發分級（PixiRenderer 接線）
- [x] 一般小怪死亡微震；nova/進化大招中震；大型死亡（自爆體）中大震；Boss 死亡最大震
- [x] Boss 受擊不震不頓（只保留命中粒子）；玩家受傷沿用既有 `hurt()`（紅暈 + 震屏）

## 頓挫觸發（收斂：只在死亡瞬間）
- [x] Boss(superbug) 死亡稍長頓挫（0.06s）、大型死亡（自爆體）短頓挫（0.04s），冷卻節流
- [x] Boss 受擊不震不頓（只命中粒子）；一般小怪死亡不頓挫

## 邊界與可及性
- [x] Boss 受擊不震不頓；密集死亡時冷卻確保頓挫不連發、不卡頓（實機 Boss 戰持續推進、不軟鎖）
- [x] 同幀多大型死亡：頓挫不疊加、震屏不超上限（HitStop 冷卻 + shake ≤12 夾擠）
- [x] reduced-motion：不震不頓（code-guarded：matchMedia 偵測 + shake/hitStop early-return）
- [x] 頓挫不影響確定性（僅本地 wall-clock 暫停，模擬/RNG 不變）

## 不變項（硬性）
- [x] World/system/模擬計算/RNG/確定性零改動（Boss=superbug 用 enemyKind 分級）
- [x] `EffectsLayer.update()` 簽章不變；`hurt()` 行為不變
- [x] 既有 193 單元測試全綠（新增 4 筆 HitStop 測試 → 共 197）

## 驗證快照（完成時填寫）
- [x] 型別檢查（vue-tsc）乾淨
- [x] Production build 乾淨
- [x] 單元測試全綠（197 = 193 + 4 HitStop）
- [x] 實機驗證（瀏覽器）：Boss 戰震屏+頓挫、Boss 高頻受擊不連抖不軟鎖（擊殺持續增長至死亡）、
      大量擊殺不卡頓、玩家受傷不變、0 功能相關 console error（僅既有 favicon 404）；
      reduced-motion 為 code-guarded
- [x] progress.md 已更新
