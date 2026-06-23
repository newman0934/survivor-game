# Spec — HUD/UI 動畫（C 批）

**日期：** 2026-06-24
**功能名稱：** ui-animation-c
**所屬階段：** 美術精修（程式化美術延伸，C 批：HUD/UI 動畫）
**狀態：** 待批准（Approval Gate）

---

## 1. Overview（總覽）

為遊戲的 DOM UI 加入核心戰鬥反饋動畫：HUD（血條/經驗條平滑填充、升級彈跳、受傷紅閃）、升級彈窗進場、
Boss 血條進場/低血脈動、死亡結算進場、phase overlay 轉場。全部走 UI 層（Vue/CSS），不碰引擎/store/模擬。

---

## 2. Business Requirements（商業需求）

- 補足整體手感：UI 不再瞬間硬跳，升級/受傷/Boss 出場/死亡都有明確視覺反饋。
- 零素材依賴、純 Vue/CSS，可在本環境產出。
- 不破壞架構紅線：引擎純 TS、UI 只讀 store summary；動畫純呈現、不改模擬/數值/確定性。

---

## 3. Functional Requirements（功能需求）

### FR-1 HUD 動畫（src/ui/Hud.vue）
- **血條/經驗條平滑填充**：`.bar .fill` 加 CSS `width` 過渡（約 0.25s ease-out），取代目前硬跳。
- **升級彈跳**：以 `watch(() => store.level)` 偵測等級上升，對 `Lv` 數字觸發一次縮放彈跳 keyframe（約 1→1.35→1）+ 短暫發光；以 class toggle + 計時器或 animationend 重置。
- **受傷紅閃**：以 `watch(() => store.hp)` 偵測 hp 下降，對血條觸發一次紅色亮閃 keyframe（約 0.3s）。
- HUD 既有版面（topbar 右側預留靜音鈕空間等）不變。

### FR-2 升級彈窗進場（src/ui/UpgradeModal.vue）
- **背景淡入**：overlay 背景一次性淡入。
- **卡片錯落進場**：標題與三張卡片以 slide-up + scale + fade 進場，逐卡用 `animation-delay`（依 index）製造錯落。
- **按壓反饋**：卡片 `:active` 輕微縮放。既有 hover 與點選 `pickUpgrade(id)` 行為不變。

### FR-3 Boss 血條（src/ui/BossBar.vue）
- **進場/退場**：以 Vue `<Transition>` 包既有 `v-if`，Boss 出現時滑下 + 淡入、消失時淡出。
- **低血脈動**：`pct < 25` 時對 `.fill` 套用脈動發光 keyframe。
- 既有 `width` 過渡（0.1s）與血量計算不變。

### FR-4 死亡結算進場（src/ui/GameOver.vue）
- overlay 背景淡入 + 內容（標題/數據/按鈕）縮放浮現（約 0.3s）。既有 `restart` 事件與數據顯示不變。

### FR-5 phase overlay 轉場（src/App.vue）
- 將互斥的三個 overlay（MainMenu / UpgradeModal / GameOver）以 Vue `<Transition>` 包裹，phase 切換時淡入淡出。
- 維持 v-if 的互斥掛載與既有引擎握手（`watch(store.phase)` 暫停/恢復）不變。

### FR-6 無障礙（prefers-reduced-motion）
- 全部動畫在 `@media (prefers-reduced-motion: reduce)` 下關閉或改為瞬時，確保偏好減少動態的使用者不受影響。

### FR-7 不變項（硬性）
- 不修改引擎（`src/engine/**`）、store（`src/stores/game.ts`）、模擬、數值、確定性、握手邏輯。
- UI 只讀 store summary；動畫狀態（class/ref/計時器）存於各元件本地，不進 store。
- 既有 122 單元測試維持全綠（UI 動畫不觸及被測邏輯）。

---

## 4. Acceptance Criteria（驗收標準）

詳見 `acceptance.md`。摘要：HUD 平滑填充 + 升級彈跳 + 受傷紅閃、升級彈窗錯落進場、Boss 血條進場+低血脈動、
死亡結算進場、overlay 轉場皆如設計；尊重 prefers-reduced-motion；引擎/store 不動、122 測試全綠、
型別/build 乾淨、實機目視、0 功能相關 console error、FPS 正常。

---

## 5. Edge Cases（邊界情況）

- **連續升級**：同一次經驗結算觸發多次升級時，彈跳動畫以最後一次重新觸發（不堆疊殘留）。
- **同時受傷又升級**：紅閃與彈跳各自獨立 keyframe、互不阻塞。
- **Boss 秒退場**：`<Transition>` 退場動畫進行中 Boss 狀態翻轉，Vue 轉場自處理、不殘留節點。
- **重新開始**：phase 由 over → menu/playing，overlay 轉場正常切換、無殘留動畫狀態。
- **reduced-motion**：所有進場/脈動/彈跳關閉或瞬時，功能與資訊不受影響。

---

## 6. API Contracts（介面契約）

- 無對外介面變更。store summary、引擎 API、emit 事件（`start`/`restart`）契約不變。
- 新增僅為各元件內部的本地動畫狀態（ref/class）與 CSS。

---

## 7. Data Model Changes（資料模型變更）

- 無。不新增 store 欄位、不改型別。

---

## 8. State Changes（狀態變更）

- 各元件本地動畫狀態（例如 `levelPulse` ref、`hurtFlash` ref）與計時器；不進 World、不進 store。

---

## 9. UI Behaviour（UI 行為）

- 遊戲畫面：HUD 平滑反饋、升級彈窗錯落進場、Boss 血條滑入/脈動、死亡畫面浮現、overlay 轉場流暢。
- 資訊內容（數值、文字、選項）與互動行為不變。

---

## 10. Non-Functional Requirements（非功能需求）

- **效能**：動畫只用 transform/opacity/width（GPU 友善），無每幀 JS；維持原 FPS。
- **確定性/邊界**：純 UI 層，不碰模擬/store；不影響可重現性。
- **無障礙**：尊重 `prefers-reduced-motion`。
- **測試**：UI 動畫屬呈現層膠水，不寫單元測試（同既有 UI 慣例）；既有 122 測試維持全綠 + 實機目視。

---

## 11. 非目標（本 spec 明確不做）

- 主選單進場/選卡動畫（本批排除，可另開）。
- UI 配色對齊免疫主題（通用藍 → 主題色，屬色彩、非動畫；可另開小批）。
- 新增 HUD 資訊項目、版面改版。
- 數字 count-up 等更進階動畫（YAGNI，本批不做）。
- 引擎/store/模擬任何變更。
