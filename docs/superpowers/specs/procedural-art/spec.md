# Spec — 程式化美術（取代佔位幾何圖形）

**日期：** 2026-06-23
**功能名稱：** procedural-art
**所屬階段：** 階段 4（提前做）— 把佔位用的幾何圖形換成「美術」
**狀態：** 待批准（Approval Gate）

---

## 1. Overview（總覽）

把目前的佔位畫面（單色圓 + 純色背景）升級為**程式化繪製的美術**：背景捲動網格、角色與五種敵人
的辨識造型、寶石/投射物/道具物件、以及輕量動畫與命中閃白。全部用 PixiJS `Graphics` 程式繪製，
**不依賴任何外部圖檔**，**引擎與 entity 完全不動**。

本 feature 幾乎全在呈現層（`PixiRenderer` + 新 `sprites.ts`），依 CLAUDE.md 慣例不寫單元測試，
以實機截圖驗證；既有 99 個單元測試維持全綠。

---

## 2. Business Requirements（商業需求）

- 大幅提升視覺完成度與遊戲「手感回饋」（朝向、命中、動態），是原型走向成品的關鍵一步。
- 零外部資產依賴，完全可在本環境產出與重現。
- 不破壞架構紅線：引擎純 TS、無 Vue/Pinia 執行期依賴；確定性（純視覺不進模擬）；固定步長不變。

---

## 3. Functional Requirements（功能需求）

### FR-1 繪製函式抽離
- 新增 `src/engine/sprites.ts`：純繪製函式
  `drawPlayer / drawEnemy / drawGem / drawProjectile / drawOrbit(g, e)`、
  `drawBackgroundGrid(g, ...)`、`drawGarlicAura(g, radius, t)`，各以 `Graphics` API 畫出造型。
- `PixiRenderer` 改為呼叫這些函式並負責編排、相機、回收、動畫驅動。

### FR-2 分層與動畫時鐘
- `world` 容器最底層加 `gridGraphics`（背景網格），其上為 garlicAura，再上為各 entity sprite。
- `PixiRenderer` 新增 `clock`（每次 render 累加約 1/60），供脈動/旋轉/呼吸動畫。

### FR-3 靜態幾何畫一次、每幀只動 transform
- 造型幾何在 `graphicFor` 首次建立時依 kind/enemyKind 畫一次。
- 每幀只更新 `position` 與動畫 `rotation / scale / alpha / tint`，不重畫幾何。
- 例外：背景網格每幀 `clear()` 重畫玩家可視範圍內的少量線（無限捲動）。

### FR-4 各元素造型（程式化）
- **背景**：深底上間距 64 的細線（白、alpha ~0.04），依可視範圍重畫。
- **玩家**：柔光圈 + 實心圓身 + 描邊 + 朝 `lastMoveDir` 的槍口三角；sprite 依朝向旋轉。
- **敵人**（依 ENEMY_DEFS.color）：basic 圓+眼；swarm 小圓+尖刺；tank 大圓+裝甲環+核心；
  charger 菱形/箭頭；boss 大圓+鋸齒冠+脈動。
- **寶石**：旋轉菱形 + 亮心 + 微脈動。
- **投射物**：亮核 + 柔光暈，依 `vel` 方向拉長/旋轉。
- **聖經環繞物**：小書本造型（雙色矩形 + 書脊），持續旋轉。
- **大蒜光環**：環形（描邊 + 極淡填充），半徑/alpha 隨時鐘呼吸。

### FR-5 命中閃白
- `PixiRenderer` 內以 `Map<Entity, number>` 記錄上幀 hp；偵測 hp 下降即把該 sprite `tint` 設白，
  約 6 幀內衰減回原色（純讀 `e.hp`）。

### FR-6 行為/資源不變
- 相機跟隨、sprite 重用與回收、`destroy()` 冪等維持；回收 entity 時一併清除其 lastHp / 動畫狀態。

---

## 4. Acceptance Criteria（驗收標準）

詳見 `acceptance.md`。摘要：背景網格捲動、玩家朝向、五種敵人造型可辨、寶石/投射物/書本/光環、
命中閃白、動畫流暢；既有 99 測試全綠、型別/build 乾淨、實機 0 功能相關 console error。

---

## 5. Edge Cases（邊界情況）

- **玩家從未移動**：`lastMoveDir` 預設朝右，槍口朝右、不閃爍。
- **entity 在畫面外**：正常繪製（相機平移）；網格只重畫可視範圍避免畫過多線。
- **大量 entity**：每幀只更新 transform + 少量網格線，沿用 sprite 重用與回收，維持效能。
- **entity 被回收**：sprite `destroy` 並從 lastHp map 移除，避免洩漏。
- **閃白衰減中 entity 死亡**：回收時清掉其閃白狀態。

---

## 6. API Contracts（介面契約）

```ts
// src/engine/sprites.ts（新檔，呈現層；可 import pixi.js）
import { Graphics } from 'pixi.js'
import type { Entity } from './types'

export function drawPlayer(g: Graphics, e: Entity): void      // 畫一次靜態造型
export function drawEnemy(g: Graphics, e: Entity): void        // 依 enemyKind 造型
export function drawGem(g: Graphics, e: Entity): void
export function drawProjectile(g: Graphics, e: Entity): void
export function drawOrbit(g: Graphics, e: Entity): void
export function drawBackgroundGrid(
  g: Graphics, centerX: number, centerY: number, viewW: number, viewH: number,
): void
export function drawGarlicAura(g: Graphics, cx: number, cy: number, radius: number, t: number): void
```

- `PixiRenderer` 對外 API（`create / render / destroy`）簽章不變。
- 無 store / Summary / 引擎 / 型別變更。

---

## 7. Data Model Changes（資料模型變更）

- 無 entity / 型別 / store 變更。
- `PixiRenderer` 新增私有狀態：`clock`、`gridGraphics`、`lastHp: Map<Entity, number>`、
  （視需要）`flash: Map<Entity, number>`。

---

## 8. State Changes（狀態變更）

- `PixiRenderer.render()` 每幀：累加 clock → 重畫背景網格 → 更新各 sprite position + 動畫 transform
  → 命中閃白判定 → 大蒜光環呼吸 → 相機平移。
- 引擎 `World` 與遊戲流程不變。

---

## 9. UI Behaviour（UI 行為）

- 遊戲畫面（canvas）視覺全面升級；HUD / 選單 / 升級彈窗 / Boss 血條等 DOM UI **不變**。

---

## 10. Non-Functional Requirements（非功能需求）

- **確定性**：動畫時鐘與 tint 純視覺，不進模擬、不碰 rng/固定步長。
- **架構邊界**：`sprites.ts` / `PixiRenderer.ts` 為呈現層（可 import PixiJS）；引擎邏輯與 store 不動。
- **效能**：靜態幾何畫一次、每幀只動 transform + 重畫少量網格線；不每幀大量 new 物件。
- **測試**：呈現層不寫單元測試（CLAUDE.md）；以實機截圖驗證 + 既有 99 測試維持全綠。
- **資源清理**：`destroy()` 維持冪等，清理 grid / lastHp。

---

## 11. 非目標（本 spec 明確不做）

- 外部 sprite 圖檔 / atlas、紋理載入管線。
- 粒子系統、死亡/拾取爆裂特效。
- 音效、HUD/選單 DOM UI 改版、背景多層視差。
