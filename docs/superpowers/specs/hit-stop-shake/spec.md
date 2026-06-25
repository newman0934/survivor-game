# Spec — 打擊頓挫 + 震屏（hit-stop-shake）

## Overview

提升打擊手感：把既有的鏡頭震屏（目前僅玩家受傷觸發）擴展到擊殺/Boss/nova 等事件並分級，
並新增 hit-stop 頓挫——在大時刻（Boss 受擊/死亡、自爆體/超級死亡）短暫凍結遊戲迴圈。
震屏與頓挫都收斂在既有 `EffectsLayer`，觸發於 `PixiRenderer` 既有的命中/擊殺偵測處；
頓挫讓 `Game` 迴圈短暫不推進（概念同既有 pause），純呈現、不碰模擬/確定性。

## Business Requirements

- 打擊與大事件更有重量感與回饋，提升遊戲手感。
- 戰鬥中頻繁擊殺不可造成卡頓——頓挫須罕見且有冷卻節流。
- 尊重 `prefers-reduced-motion`（暈動症友善）。

## Functional Requirements

- **FR-1 EffectsLayer.shake**：抽出公開 `shake(intensity: number)`（提高 `shakeIntensity`，沿用既有夾擠上限）；
  既有 `hurt()` 改為呼叫 `shake()`（受傷震屏行為不變）。
- **FR-2 EffectsLayer.hitStop**：新增 `hitStop(seconds: number)` 設定頓挫凍結剩餘時間，受**全域冷卻**節流
  （冷卻未到則忽略）；`update()` 每幀以 DT 遞減頓挫剩餘與冷卻；新增 `isHitStopped(): boolean`。
- **FR-3 Game 凍結**：`Game` 迴圈在累積時間 + 推進 step 前檢查 `isHitStopped()`；凍結時不累積 frameTime、
  不 `world.step()`、續渲染（真凍結、無事後追趕）。
- **FR-4 震屏觸發分級**：`PixiRenderer` 既有偵測處接線——一般小怪死亡微震；nova/進化大招命中中震；
  大型死亡（自爆體/超級）中大震；Boss 受擊大震；Boss 死亡最大震。
- **FR-5 頓挫觸發**：**頓挫只在死亡瞬間**（收斂）——Boss(superbug) 死亡稍長頓挫、大型死亡（自爆體）短頓挫，受全域冷卻節流；
  Boss 受擊只大震屏、**不頓挫**（避免 Boss 戰連續凍結感）。
- **FR-6 可及性**：`prefers-reduced-motion: reduce` 時關閉震屏與頓挫（`EffectsLayer` 啟動查一次 media query）。

## Acceptance Criteria

詳見 `acceptance.md`（唯一驗收來源）。重點：震屏分級正確、頓挫只在大時刻且有冷卻不連抖、
一般擊殺不卡頓、reduced-motion 關閉、確定性不變、typecheck/build 乾淨、新增 EffectsLayer 測試與既有 193 全綠。

## Edge Cases

- Boss 被自動火力高頻命中：冷卻（~0.35s）確保頓挫不連發、不卡頓。
- 同幀多個大型死亡：冷卻防頓挫疊加；震屏沿用既有上限（≤12）不爆量。
- 頓挫期間遊戲已暫停/升級：已不在 step，頓挫於 render 自然到期、無副作用。
- `prefers-reduced-motion`：震屏與頓挫皆關閉。
- 頓挫僅跳過本地 wall-clock 推進，模擬內容/RNG/確定性不變。

## API Contracts

- `EffectsLayer`：新增 `shake(intensity: number)`、`hitStop(seconds: number)`、`isHitStopped(): boolean`；
  `hurt()` 行為不變（內部改呼叫 `shake`）；`update()` 簽章不變（仍回 `{ shakeX, shakeY }`）。
- `PixiRenderer`：新增 `isHitStopped(): boolean`（委派 `effects`）供 `Game` 讀取；既有對外行為不變。
- `Game`：迴圈內部讀取頓挫狀態；對外 API 不變。

## Data Model Changes

無。`EffectsLayer` 新增私有計時欄位（頓挫剩餘、冷卻、reduced-motion 旗標）。無引擎資料/持久化變更。

## State Changes

無遊戲模擬狀態變更。頓挫為迴圈本地節奏（同 pause），不影響 World/RNG。

## UI Behaviour

- 擊殺/Boss/nova 觸發鏡頭震動（依事件分級）。
- 大時刻（Boss 受擊/死亡、自爆/超級死亡）短暫凍結畫面，增加打擊重量感。
- reduced-motion 下畫面穩定不震不頓。

## Non-Functional Requirements

- **效能**：純呈現；頓挫罕見且短；震屏沿用既有衰減/上限；高頻擊殺不掉幀。
- **確定性**：頓挫不改模擬內容/RNG；World/system 零改動。
- **可及性**：尊重 `prefers-reduced-motion`。
- **架構純度**：震屏/頓挫收斂於 `EffectsLayer`（呈現層）；`Game` 僅讀頓挫狀態決定是否推進；不碰 Vue/store。
- **多人**：頓挫為單機表現效果、觸發為 render-side（非確定性），未來多人需 gate（見多人設計文件）。
