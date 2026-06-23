# Spec — 地圖背景視覺強化

**日期：** 2026-06-23
**功能名稱：** map-background
**所屬階段：** 美術精修（程式化美術延伸）
**狀態：** 待批准（Approval Gate）

---

## 1. Overview（總覽）

把目前「底色 + 單層捲動網格」的地圖背景，升級為三張地圖**各自獨特的程式化地貌**：
每張圖在地面散布專屬特徵（平原草叢/碎石、熔岩岩裂/餘燼、冰原冰裂/雪堆），並疊一層
**輕量氛圍動畫**（餘燼脈動、雪點飄落等）。地面特徵以「格點座標 hash」決定散布——
玩家無限捲動時穩定重現、且不呼叫 `Math.random()` 或模擬 RNG。

全部在 `sprites.ts`（呈現層）新增繪製，World 僅新增一個唯讀 `mapKind`。
hash helper 為純函式、寫單元測試；繪製/renderer 屬膠水層、以實機驗證。

---

## 2. Business Requirements（商業需求）

- 提升場景氛圍與三張地圖的視覺辨識度，是 multi-maps 之後的視覺一步。
- 零素材依賴、純程式繪製，完全可在本環境產出。
- 不破壞架構紅線：引擎純 TS、無 Vue/Pinia 執行期依賴；確定性；固定步長；背景純呈現、不碰模擬。

---

## 3. Functional Requirements（功能需求）

### FR-1 背景繪製進入點
- 在 `sprites.ts` 新增 `drawMapBackground(g, kind, cx, cy, viewW, viewH, clock, gridColor, gridAlpha)`：
  依 `kind` 畫「地面特徵層 + 氛圍動畫層」，並用 `gridColor/gridAlpha` 疊一層淡網格。
- 取代 `PixiRenderer.render()` 目前對 `drawBackgroundGrid` 的直接呼叫。
- `drawBackgroundGrid` 保留為共用底層工具，由 `drawMapBackground` 內部呼叫。

### FR-2 確定性 hash helper（純函式，可測）
- 新增 `bgHash(gx, gy)`：整數格座標 → `[0,1)` 偽隨機值（純函式、確定性）。
- 用途：決定某格是否有特徵、特徵種類、本地偏移、大小、旋轉。
- 不使用 `Math.random()`，也不使用模擬的 `core/rng`（那是給遊戲邏輯）。

### FR-3 地面特徵層（依 kind，世界座標、隨玩家捲動）
- 沿用 `drawBackgroundGrid` 的視窗裁切迴圈，只走可視範圍內的格子（格距較大，如 128）。
- 每格用 `bgHash` 決定是否繪製及其外觀，同格永遠相同 → 捲動穩定重現。
- **plains**：淡綠草叢（數筆短線）與零星小石。
- **lava**：暗色岩裂折線與餘燼亮點。
- **tundra**：淺藍冰裂折線與雪堆塊。

### FR-4 氛圍動畫層（依 kind，靠 clock）
- **plains**：緩慢飄移的草屑/光點。
- **lava**：餘燼亮點 alpha 脈動（`clock` 驅動）+ 少量上升火星。
- **tundra**：雪點緩緩飄落（螢幕空間環繞循環）。
- 粒子數量固定上限（數十顆量級），不隨時間累積。

### FR-5 World 暴露 mapKind
- `World` 新增唯讀 `mapKind: MapKind`（建構時由 `map` 參數設定）。
- 底色仍走既有 `world.mapBgColor`；網格色/透明度仍走 `mapGridColor/mapGridAlpha`。

### FR-6 不變項
- `drawBackgroundGrid` 簽章不變。
- 模擬、碰撞、生怪、難度倍率、相機、entity 造型完全不動。
- 每張圖底色沿用既有 `MAP_DEFS` 的 `bgColor`。

---

## 4. Acceptance Criteria（驗收標準）

詳見 `acceptance.md`。摘要：三張地圖各具專屬地面地貌與氛圍動畫、無限捲動穩定重現、
氛圍動畫流暢；`bgHash` 確定性單元測試通過；既有測試全綠、型別/build 乾淨、實機驗證、
0 功能相關 console error、FPS 正常。

---

## 5. Edge Cases（邊界情況）

- **捲動穩定**：地面特徵由 `bgHash(gx,gy)` 決定，與玩家位置無關，往返同一格畫面一致。
- **可視裁切**：只繪製可視範圍內的格子，遠處不畫，避免無界迴圈。
- **氛圍粒子上限**：粒子數固定、不累積，長時間遊玩不漏記憶體、不掉 FPS。
- **底色相容**：`renderer.background.color` 仍由 `world.mapBgColor` 設定，背景層畫在其上。
- **不擋視線**：地貌特徵為低透明度/暗色，不與敵人/寶石/投射物造型混淆。
- **確定性**：`bgHash` 為純整數運算、無浮點不穩定，不引入模擬隨機。

---

## 6. API Contracts（介面契約）

```ts
// engine/sprites.ts
export function drawMapBackground(
  g: Graphics, kind: MapKind, cx: number, cy: number,
  viewW: number, viewH: number, clock: number, gridColor: number, gridAlpha: number,
): void
export function bgHash(gx: number, gy: number): number // [0,1) 純函式
// drawBackgroundGrid 簽章不變（內部被 drawMapBackground 呼叫）

// World.ts
mapKind: MapKind // 唯讀，建構時設定
```

- 引擎模擬 / 型別 `MapDef` / store / Summary 介面不變。

---

## 7. Data Model Changes（資料模型變更）

- `World` 新增 `mapKind: MapKind`（由既有建構子 `map` 參數設定）。
- `sprites.ts` 新增 `drawMapBackground` 與 `bgHash`。
- `MapDef` 與 `MAP_DEFS` 不變（沿用既有 `bgColor/gridColor/gridAlpha`）。

---

## 8. State Changes（狀態變更）

- 無模擬狀態變更。背景動畫由 renderer 既有 `clock`（每幀 +1/60）驅動，純呈現。

---

## 9. UI Behaviour（UI 行為）

- 三張地圖在遊戲畫面各呈現專屬地貌與氛圍動畫；隨玩家移動捲動。
- HUD / 選單 / 升級彈窗 / Boss 血條 / 死亡結算不變。

---

## 10. Non-Functional Requirements（非功能需求）

- **確定性**：地面特徵走 `bgHash` 純函式；氛圍動畫走 renderer clock，皆不進 sim、不碰模擬 RNG。
- **架構邊界**：只動 `sprites.ts`（呈現層）+ `World` 新增唯讀 `mapKind` + `PixiRenderer` 換呼叫；
  引擎模擬/store/型別契約不變。
- **效能**：每幀只繪製可視範圍格子 + 固定上限粒子；背景仍為每幀重畫的單一 Graphics（同現有網格）。
- **資源清理**：`Game.stop()` / `PixiRenderer.destroy()` 維持冪等（沿用現有背景 Graphics 生命週期）。
- **TDD**：`bgHash` 純函式寫單元測試；`drawMapBackground`/renderer 屬膠水層、實機驗證。

---

## 11. 非目標（本 spec 明確不做）

- 障礙物 / 牆壁 / 地圖邊界碰撞（地貌純視覺、不影響移動）。
- 多層視差背景、外部圖片素材 / texture。
- 新地圖種類（仍是 plains / lava / tundra 三張）。
- 地圖專屬音樂 / 敵種。
