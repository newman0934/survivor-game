# Spec — 手機支援（觸控操作 + RWD）

**日期：** 2026-06-23
**功能名稱：** mobile-support
**所屬階段：** 跨階段（平台支援，非路線圖既有項）
**狀態：** 待批准（Approval Gate）

---

## 1. Overview（總覽）

讓遊戲可在手機瀏覽器遊玩：新增**浮動虛擬搖桿**觸控操作（與鍵盤並存，桌機手機通吃），
並做 **RWD/視口**處理（防捲動縮放、選單在小螢幕可用）。攻擊本就自動，故只需移動操作。

觸控方向計算抽出純函式寫單元測試；觸控事件、搖桿繪製、RWD 為膠水/視覺層，以行動裝置模擬驗證。

---

## 2. Business Requirements（商業需求）

- 擴大可遊玩平台至手機，是觸及更多玩家的關鍵。
- 不影響桌機鍵盤體驗（兩者並存、自動 fallback）。
- 不破壞架構紅線：引擎純 TS、無 Vue/Pinia 執行期依賴；確定性；固定步長。

---

## 3. Functional Requirements（功能需求）

### FR-1 觸控輸入（浮動虛擬搖桿）
- 新增 `src/engine/core/touchInput.ts` 的 `TouchInput` 類別（Pointer Events，touch + 滑鼠通用）。
  - `attach(el)` / `detach()`：在 canvas 宿主元素監聽 pointerdown/move/up/cancel。
  - 按下記錄原點 + active 並記 pointerId（只追第一指）；移動更新當前點；放開/取消 → inactive。
  - `direction()`：active 時回 `joystickVector(origin, cur, deadzone=12)`；否則 `{0,0}`。
  - `joystick` 狀態：`{ active, ox, oy, cx, cy }`（元素內座標，供畫搖桿）。
- 抽出純函式 `joystickVector(ox, oy, cx, cy, deadzone)`：距離 ≤ deadzone 回 `{0,0}`，
  否則回正規化單位向量（方向 = cur − origin）。

### FR-2 Game 合併輸入
- `Game` 新增 `touch = new TouchInput()`，`start` 時 `attach(canvasParent)`、`stop` 時 `detach()`（冪等）。
- 每幀：觸控有方向（非 0）則用觸控、否則用鍵盤 → 寫入 `world.moveInput`。

### FR-3 搖桿視覺（renderer 螢幕固定層）
- `PixiRenderer` 新增固定於螢幕的 `ui` 容器（加在 `app.stage`，不在會平移的 world 容器）。
- 新增 `drawJoystick(js)`：active 時於原點畫底座圈（半徑 48）+ 當前點（夾半徑 48 內）畫旋鈕（半徑 22）；
  非 active 清空。
- `Game` 每幀 `render(world)` 後呼叫 `renderer.drawJoystick(touch.joystick)`。

### FR-4 RWD / 視口
- `index.html`：viewport `width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no,
  viewport-fit=cover`；body/#app `touch-action:none; overscroll-behavior:none; user-select:none;
  -webkit-user-select:none; -webkit-tap-highlight-color:transparent;`。
- `MainMenu`：`@media (max-width: 600px)` 縮小標題/卡片/間距，確保角色排 + 地圖排在窄螢幕可捲動瀏覽。

---

## 4. Acceptance Criteria（驗收標準）

詳見 `acceptance.md`。摘要：手機（模擬）可用搖桿移動玩家、搖桿視覺顯示、選單在窄螢幕可用、
桌機鍵盤不受影響；`joystickVector` 單元測試 + 既有測試全綠、型別/build 乾淨。

---

## 5. Edge Cases（邊界情況）

- **多指**：只追第一個 pointer（記 pointerId），其餘忽略；放開該指才 inactive。
- **觸控+鍵盤同時**：觸控 active 優先；放開後回鍵盤。
- **元素外放開 / pointercancel**：視為 inactive。
- **拖出畫面**：方向仍依 cur − origin；旋鈕視覺夾在半徑內。
- **死區邊界**：距離 ≤ deadzone 視為死區內（回 0）。
- **桌機滑鼠拖曳**：也會驅動搖桿（無害；桌機主要用鍵盤）。

---

## 6. API Contracts（介面契約）

```ts
// core/touchInput.ts
import type { Vec2 } from './vector'

export function joystickVector(ox: number, oy: number, cx: number, cy: number, deadzone: number): Vec2

export class TouchInput {
  attach(el: HTMLElement): void
  detach(): void
  direction(): Vec2
  readonly joystick: { active: boolean; ox: number; oy: number; cx: number; cy: number }
}

// engine/Game.ts — 內部新增 touch；每幀合併輸入並 drawJoystick

// engine/PixiRenderer.ts
drawJoystick(js: { active: boolean; ox: number; oy: number; cx: number; cy: number }): void
```

- store / Summary / 型別（types.ts）不變。

---

## 7. Data Model Changes（資料模型變更）

- 新增 `TouchInput` 類別與 `joystickVector` 純函式。
- `PixiRenderer` 新增 `ui` 容器與 `joystickGfx`。
- `Game` 新增 `touch` 欄位。
- index.html / MainMenu.vue 樣式調整。

---

## 8. State Changes（狀態變更）

- `Game.loop` 每幀以「觸控優先、否則鍵盤」決定 `world.moveInput`，並繪製搖桿。
- 其餘流程不變。

---

## 9. UI Behaviour（UI 行為）

- 手機：按住畫面任一處拖曳出現搖桿、控制移動；放開消失。
- 選單在窄螢幕字級/卡片縮小、可捲動。
- HUD / 升級彈窗 / Boss 血條 / 死亡結算沿用既有置中佈局，手機自適配。
- 桌機：鍵盤操作不變。

---

## 10. Non-Functional Requirements（非功能需求）

- **確定性**：觸控只改 `moveInput`，與 rng/固定步長無關。
- **架構邊界**：`touchInput.ts` 純 TS、無 Vue/Pinia；搖桿在 renderer 呈現層；RWD 在 index.html/MainMenu。
- **TDD**：`joystickVector` 寫單元測試；事件/繪製/RWD 以行動模擬驗證。
- **資源清理**：`Game.stop()` detach 觸控（冪等）；renderer destroy 一併銷毀 ui 層。

---

## 11. 數值（草案）

- 死區 deadzone = 12px；搖桿底座半徑 48px、旋鈕半徑 22px。
- 底座圈 alpha 0.12 + 描邊 0.25；旋鈕 alpha 0.3（白色）。
- media query 斷點 600px。

---

## 12. 非目標（本 spec 明確不做）

- 行動裝置專屬 UI 改版、虛擬攻擊鈕（攻擊自動）。
- 橫豎屏鎖定、PWA/離線、手勢縮放。
